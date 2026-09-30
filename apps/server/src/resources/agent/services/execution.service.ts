import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  AssistantRunPhase,
  AssistantRunStatus,
  AssistantStepType,
} from '@repo/contracts/assistant';
import { EntityManager, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Run } from '../entities/run.entity';
import { RunCheckpoint } from '../entities/run-checkpoint.entity';
import { RunEvent } from '../entities/run-event.entity';
import { RunStep } from '../entities/run-step.entity';
import { RunContinuation } from '../entities/run-continuation.entity';
import type { AiMessage, AiToolCall } from '../../ai/types/provider';
import { RunLiveEventService } from './run-live-event.service';
import {
  isRecord,
  redactProperties,
  stableStringify,
} from '../../../shared/utils/helper';
import type { Configuration } from '../../../shared/types';

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

const TEXT_PROPERTIES = new Set(['text']);

@Injectable()
export class ExecutionService {
  constructor(
    @InjectRepository(Run)
    private readonly runRepository: Repository<Run>,
    private readonly liveEvents: RunLiveEventService,
    @Optional()
    private readonly config?: ConfigService<Configuration>,
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

  async recoverAbandonedRun(runId: string): Promise<Run> {
    return this.runRepository.manager.transaction(async (manager) => {
      const run = await this.lockRun(manager, runId);
      if (run.status !== 'running') {
        throw new ConflictException(
          `Cannot recover assistant run from ${run.status}`,
        );
      }

      const recoveredAt = new Date();
      await manager.update(
        RunStep,
        { runId, status: 'running' },
        {
          status: 'failed',
          error: 'Worker stopped before the step completed',
          completedAt: recoveredAt,
        },
      );

      run.status = 'queued';
      run.phase = 'queued';
      run.error = null;
      run.completedAt = null;
      run.checkpointVersion += 1;
      await manager.save(run);
      await this.appendEvent(manager, runId, 'run.recovered', {
        status: run.status,
        phase: run.phase,
        reason: 'worker_stalled',
      });
      await manager.save(
        manager.create(RunCheckpoint, {
          runId,
          version: run.checkpointVersion,
          status: run.status,
          phase: run.phase,
          state: { reason: 'worker_stalled' },
        }),
      );
      return run;
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
        run.modelCallCount += 1;
      } else if (type === 'tool') {
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
          input:
            type === 'tool' ? redactProperties(input, TEXT_PROPERTIES) : input,
        }),
      );
      await this.appendEvent(manager, runId, 'step.started', {
        stepId: step.id,
        sequence: step.sequence,
        stepType: type,
        ...(type === 'tool' || type === 'verification'
          ? { detail: step.input }
          : {}),
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
        step.input = redactProperties(step.input, TEXT_PROPERTIES);
        step.output = redactProperties(step.output, TEXT_PROPERTIES);
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

  async recordEvent(
    runId: string,
    type: string,
    data: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    await this.runRepository.manager.transaction(async (manager) => {
      await this.lockRun(manager, runId);
      await this.appendEvent(manager, runId, type, data);
    });
  }

  publishLiveEvent(
    runId: string,
    type: string,
    data: Readonly<Record<string, unknown>>,
  ): void {
    this.liveEvents.publish(runId, { type, data });
  }

  closeLiveEvents(runId: string): void {
    this.liveEvents.close(runId);
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
        step.type === 'model'
          ? redactProperties(output, TEXT_PROPERTIES)
          : output;
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

  async assertToolResultProgress(runId: string): Promise<void> {
    const threshold =
      this.config?.get('assistantAgent.noProgressThreshold', {
        infer: true,
      }) ?? 3;
    if (!Number.isInteger(threshold) || threshold < 2) {
      throw new Error(`Invalid agent no-progress threshold: ${threshold}`);
    }
    const recent = await this.runRepository.manager.find(RunStep, {
      where: { runId, type: 'tool' },
      order: { sequence: 'DESC' },
      take: threshold,
    });
    if (recent.length < threshold) return;
    const signature = this.toolProgressSignature(recent[0]);
    if (
      recent.every((step) => this.toolProgressSignature(step) === signature)
    ) {
      throw new LoopDetectedError();
    }
  }

  private toolProgressSignature(step: RunStep): string {
    const input = isRecord(step.input) ? { ...step.input } : step.input;
    const action = isRecord(input) ? input : { input };
    delete action.toolCallId;
    return (
      stableStringify({
        action,
        status: step.status,
        output: step.output,
        error: step.error,
      }) ?? ''
    );
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

export class LoopDetectedError extends Error {
  constructor() {
    super('Assistant repeated the same action and result without progress');
    this.name = 'LoopDetectedError';
  }
}
