import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  AssistantRunPhase,
  AssistantRunStatus,
  AssistantStepType,
} from '@repo/contracts/assistant';
import { EntityManager, Repository } from 'typeorm';
import { AssistantRun } from '../entities/run.entity';
import { AssistantRunCheckpoint } from '../entities/run-checkpoint.entity';
import { AssistantRunEvent } from '../entities/run-event.entity';
import { AssistantRunStep } from '../entities/run-step.entity';
import { ASSISTANT_REPEATED_ACTION_LIMIT } from '../assistant.constants';

interface TransitionInput {
  readonly expectedStatuses: readonly AssistantRunStatus[];
  readonly status: AssistantRunStatus;
  readonly phase: AssistantRunPhase;
  readonly eventType: string;
  readonly eventData?: Readonly<Record<string, unknown>>;
  readonly checkpointState?: Readonly<Record<string, unknown>>;
  readonly patch?: Partial<AssistantRun>;
}

const ALLOWED_STATUS_TRANSITIONS: Readonly<
  Record<AssistantRunStatus, readonly AssistantRunStatus[]>
> = {
  queued: ['queued', 'running', 'failed', 'cancelled'],
  running: [
    'running',
    'queued',
    'awaiting_approval',
    'completed',
    'failed',
    'cancelled',
  ],
  awaiting_approval: ['queued', 'failed', 'cancelled'],
  completed: [],
  failed: [],
  cancelled: [],
};

@Injectable()
export class AssistantExecutionService {
  constructor(
    @InjectRepository(AssistantRun)
    private readonly runRepository: Repository<AssistantRun>,
  ) {}

  async transition(
    runId: string,
    input: TransitionInput,
  ): Promise<AssistantRun> {
    return this.runRepository.manager.transaction(async (manager) => {
      const run = await manager.findOne(AssistantRun, {
        where: { id: runId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!run) {
        throw new NotFoundException('Assistant run not found');
      }
      if (!input.expectedStatuses.includes(run.status)) {
        throw new ConflictException(
          `Cannot transition assistant run from ${run.status} to ${input.status}`,
        );
      }
      if (!ALLOWED_STATUS_TRANSITIONS[run.status].includes(input.status)) {
        throw new ConflictException(
          `Assistant run transition ${run.status} -> ${input.status} is not allowed`,
        );
      }

      const checkpointVersion = run.checkpointVersion + 1;
      const updated = Object.assign(run, input.patch ?? {}, {
        status: input.status,
        phase: input.phase,
        checkpointVersion,
      });
      await manager.save(updated);
      await this.appendEvent(manager, runId, input.eventType, {
        status: input.status,
        phase: input.phase,
        ...(input.eventData ?? {}),
      });
      await manager.save(
        manager.create(AssistantRunCheckpoint, {
          runId,
          version: checkpointVersion,
          status: input.status,
          phase: input.phase,
          state: input.checkpointState,
        }),
      );
      return updated;
    });
  }

  async startStep(
    runId: string,
    type: AssistantStepType,
    input?: unknown,
  ): Promise<AssistantRunStep> {
    return this.runRepository.manager.transaction(async (manager) => {
      const run = await this.lockRun(manager, runId);
      if (type === 'model') {
        if (run.modelCallCount >= run.maxModelCalls) {
          throw new AssistantBudgetExceededError('model calls');
        }
        run.modelCallCount += 1;
      } else if (type === 'tool') {
        if (run.toolCallCount >= run.maxToolCalls) {
          throw new AssistantBudgetExceededError('tool calls');
        }
        await this.assertToolProgress(manager, runId, input);
        run.toolCallCount += 1;
      }
      await manager.save(run);
      const { maximum } = (await manager
        .createQueryBuilder(AssistantRunStep, 'step')
        .select('COALESCE(MAX(step.sequence), 0)', 'maximum')
        .where('step.runId = :runId', { runId })
        .getRawOne<{ maximum: string }>()) ?? { maximum: '0' };
      const step = await manager.save(
        manager.create(AssistantRunStep, {
          runId,
          sequence: Number(maximum) + 1,
          type,
          status: 'running',
          input,
        }),
      );
      await this.appendEvent(manager, runId, 'step.started', {
        stepId: step.id,
        sequence: step.sequence,
        stepType: type,
      });
      return step;
    });
  }

  async completeStep(stepId: string, output?: unknown): Promise<void> {
    await this.finishStep(stepId, 'completed', output);
  }

  async failStep(stepId: string, error: unknown): Promise<void> {
    await this.finishStep(
      stepId,
      'failed',
      undefined,
      error instanceof Error ? error.message : 'Unknown execution error',
    );
  }

  private async finishStep(
    stepId: string,
    status: 'completed' | 'failed',
    output?: unknown,
    error?: string,
  ): Promise<void> {
    await this.runRepository.manager.transaction(async (manager) => {
      const step = await manager.findOne(AssistantRunStep, {
        where: { id: stepId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!step || step.status !== 'running') {
        throw new ConflictException('Assistant step is not running');
      }
      step.status = status;
      step.output = output;
      step.error = error;
      step.completedAt = new Date();
      await manager.save(step);
      await this.appendEvent(manager, step.runId, `step.${status}`, {
        stepId,
        sequence: step.sequence,
        stepType: step.type,
        ...(error ? { error } : {}),
      });
    });
  }

  private async lockRun(
    manager: EntityManager,
    runId: string,
  ): Promise<AssistantRun> {
    const run = await manager.findOne(AssistantRun, {
      where: { id: runId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!run) throw new NotFoundException('Assistant run not found');
    return run;
  }

  private async assertToolProgress(
    manager: EntityManager,
    runId: string,
    input: unknown,
  ): Promise<void> {
    const recent = await manager.find(AssistantRunStep, {
      where: { runId, type: 'tool' },
      order: { sequence: 'DESC' },
      take: ASSISTANT_REPEATED_ACTION_LIMIT - 1,
    });
    if (recent.length < ASSISTANT_REPEATED_ACTION_LIMIT - 1) return;
    const signature = this.actionSignature(input);
    if (
      recent.every((step) => this.actionSignature(step.input) === signature)
    ) {
      throw new AssistantLoopDetectedError();
    }
  }

  private actionSignature(input: unknown): string {
    if (!input || typeof input !== 'object') return this.stableStringify(input);
    const action = { ...(input as Record<string, unknown>) };
    delete action.toolCallId;
    return this.stableStringify(action);
  }

  private stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
      return `{${Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(
          ([key, item]) =>
            `${JSON.stringify(key)}:${this.stableStringify(item)}`,
        )
        .join(',')}}`;
    }
    return JSON.stringify(value);
  }

  private async appendEvent(
    manager: EntityManager,
    runId: string,
    type: string,
    data: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    const { maximum } = (await manager
      .createQueryBuilder(AssistantRunEvent, 'event')
      .select('COALESCE(MAX(event.sequence), 0)', 'maximum')
      .where('event.runId = :runId', { runId })
      .getRawOne<{ maximum: string }>()) ?? { maximum: '0' };
    await manager.save(
      manager.create(AssistantRunEvent, {
        runId,
        sequence: Number(maximum) + 1,
        type,
        data,
      }),
    );
  }
}

export class AssistantBudgetExceededError extends Error {
  constructor(resource: string) {
    super(`Assistant run exhausted its ${resource} budget`);
    this.name = 'AssistantBudgetExceededError';
  }
}

export class AssistantLoopDetectedError extends Error {
  constructor() {
    super('Assistant repeated the same browser action without progress');
    this.name = 'AssistantLoopDetectedError';
  }
}
