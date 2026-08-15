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
import { Run } from '../entities/run.entity';
import { RunCheckpoint } from '../entities/run-checkpoint.entity';
import { RunEvent } from '../entities/run-event.entity';
import { RunStep } from '../entities/run-step.entity';
import { REPEATED_ACTION_LIMIT } from '../constants';
import { RunContinuation } from '../entities/run-continuation.entity';
import type { AiMessage, AiToolCall } from '../../ai/types/provider';

interface TransitionInput {
  readonly expectedStatuses: readonly AssistantRunStatus[];
  readonly status: AssistantRunStatus;
  readonly phase: AssistantRunPhase;
  readonly eventType: string;
  readonly eventData?: Readonly<Record<string, unknown>>;
  readonly checkpointState?: Readonly<Record<string, unknown>>;
  readonly patch?: Partial<Run>;
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
  suspended: ['queued', 'failed', 'cancelled'],
  completed: [],
  failed: [],
  cancelled: [],
};

@Injectable()
export class ExecutionService {
  constructor(
    @InjectRepository(Run)
    private readonly runRepository: Repository<Run>,
  ) {}

  async transition(runId: string, input: TransitionInput): Promise<Run> {
    return this.runRepository.manager.transaction(async (manager) => {
      const run = await manager.findOne(Run, {
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
        manager.create(RunCheckpoint, {
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
  ): Promise<RunStep> {
    return this.runRepository.manager.transaction(async (manager) => {
      const run = await this.lockRun(manager, runId);
      if (type === 'model') {
        if (run.modelCallCount >= run.maxModelCalls) {
          throw new BudgetExceededError('model calls');
        }
        run.modelCallCount += 1;
      } else if (type === 'tool') {
        if (run.toolCallCount >= run.maxToolCalls) {
          throw new BudgetExceededError('tool calls');
        }
        await this.assertToolProgress(manager, runId, input);
        run.toolCallCount += 1;
      }
      await manager.save(run);
      const { maximum } = (await manager
        .createQueryBuilder(RunStep, 'step')
        .select('COALESCE(MAX(step.sequence), 0)', 'maximum')
        .where('step.runId = :runId', { runId })
        .getRawOne<{ maximum: string }>()) ?? { maximum: '0' };
      const step = await manager.save(
        manager.create(RunStep, {
          runId,
          sequence: Number(maximum) + 1,
          type,
          status: 'running',
          input: type === 'tool' ? this.redactTextFields(input) : input,
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

  async saveContinuation(
    runId: string,
    iteration: number,
    messages: readonly AiMessage[],
    pendingToolCalls: readonly AiToolCall[],
    idempotencyKey: string,
  ): Promise<void> {
    await this.runRepository.manager.transaction(async (manager) => {
      await this.lockRun(manager, runId);
      await manager.save(
        manager.create(RunContinuation, {
          runId,
          iteration,
          messages,
          pendingToolCalls,
          idempotencyKey,
          reason: 'prepared',
          dispatchState: 'prepared',
        }),
      );
    });
  }

  getContinuation(runId: string): Promise<RunContinuation | null> {
    return this.runRepository.manager.findOne(RunContinuation, {
      where: { runId },
    });
  }

  async markContinuation(
    runId: string,
    reason: 'approval' | 'browser_unavailable',
    dispatchState: 'prepared' | 'unknown',
  ): Promise<void> {
    await this.runRepository.manager.update(
      RunContinuation,
      { runId },
      { reason, dispatchState },
    );
  }

  async clearContinuation(runId: string): Promise<void> {
    await this.runRepository.manager.delete(RunContinuation, {
      runId,
    });
  }

  async redactSensitiveToolText(runId: string): Promise<void> {
    await this.runRepository.manager.transaction(async (manager) => {
      await this.lockRun(manager, runId);
      const steps = await manager.find(RunStep, { where: { runId } });
      for (const step of steps) {
        step.input = this.redactTextFields(step.input);
        step.output = this.redactTextFields(step.output);
      }
      await manager.save(steps);
      await manager.delete(RunContinuation, { runId });
    });
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
      const step = await manager.findOne(RunStep, {
        where: { id: stepId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!step || step.status !== 'running') {
        throw new ConflictException('Assistant step is not running');
      }
      step.status = status;
      step.output =
        step.type === 'model' ? this.redactTextFields(output) : output;
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

  private async lockRun(manager: EntityManager, runId: string): Promise<Run> {
    const run = await manager.findOne(Run, {
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
    const recent = await manager.find(RunStep, {
      where: { runId, type: 'tool' },
      order: { sequence: 'DESC' },
      take: REPEATED_ACTION_LIMIT - 1,
    });
    if (recent.length < REPEATED_ACTION_LIMIT - 1) return;
    const signature = this.actionSignature(this.redactTextFields(input));
    if (
      recent.every((step) => this.actionSignature(step.input) === signature)
    ) {
      throw new LoopDetectedError();
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

  private redactTextFields(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.redactTextFields(item));
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [
          key,
          key === 'text' ? '[REDACTED]' : this.redactTextFields(item),
        ]),
      );
    }
    return value;
  }

  private async appendEvent(
    manager: EntityManager,
    runId: string,
    type: string,
    data: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    const { maximum } = (await manager
      .createQueryBuilder(RunEvent, 'event')
      .select('COALESCE(MAX(event.sequence), 0)', 'maximum')
      .where('event.runId = :runId', { runId })
      .getRawOne<{ maximum: string }>()) ?? { maximum: '0' };
    await manager.save(
      manager.create(RunEvent, {
        runId,
        sequence: Number(maximum) + 1,
        type,
        data,
      }),
    );
  }
}

export class BudgetExceededError extends Error {
  constructor(resource: string) {
    super(`Assistant run exhausted its ${resource} budget`);
    this.name = 'BudgetExceededError';
  }
}

export class LoopDetectedError extends Error {
  constructor() {
    super('Assistant repeated the same browser action without progress');
    this.name = 'LoopDetectedError';
  }
}
