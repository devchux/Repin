import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import type { MessageEvent } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import type { EntityManager } from 'typeorm';
import { Repository } from 'typeorm';
import type {
  AssistantCapability,
  AssistantExecutionLane,
} from '@repo/contracts/assistant';
import {
  distinctUntilChanged,
  filter,
  interval,
  map,
  merge,
  Observable,
  share,
  switchMap,
  take,
  takeUntil,
  takeWhile,
  timer,
} from 'rxjs';
import { ExecutionService } from '../../agent/services/execution.service';
import { Run } from '../../agent/entities/run.entity';
import {
  BACKGROUND_QUEUE,
  EXECUTE_JOB,
  INTERACTIVE_QUEUE,
  MAX_QUEUED_RUNS_PER_USER,
} from '../constants';
import type { ExecuteDto } from '../dto/execute.dto';
import { RunHandler } from './run-handler.service';

@Injectable()
export class RunService {
  constructor(
    @InjectRepository(Run)
    private readonly repository: Repository<Run>,
    @InjectQueue(INTERACTIVE_QUEUE) private readonly shortQueue: Queue,
    @InjectQueue(BACKGROUND_QUEUE) private readonly longQueue: Queue,
    private readonly handler: RunHandler,
    private readonly execution: ExecutionService,
  ) {}

  async findRun(userId: number, runId: string) {
    return {
      message: 'Assistant run found successfully',
      data: this.toResponse(await this.findUserRun(userId, runId)),
    };
  }

  async watchRun(
    userId: number,
    runId: string,
  ): Promise<Observable<MessageEvent>> {
    await this.findUserRun(userId, runId);
    const runs = timer(0, 1000).pipe(
      switchMap(() => this.findUserRun(userId, runId)),
      share(),
    );
    const terminalRun = runs.pipe(
      filter((run) => this.isTerminal(run)),
      take(1),
    );
    const statusEvents = runs.pipe(
      distinctUntilChanged(
        (previous, current) =>
          previous.status === current.status &&
          previous.updatedAt.getTime() === current.updatedAt.getTime(),
      ),
      map(
        (run): MessageEvent => ({
          id: `${run.id}:${run.updatedAt.getTime()}`,
          type: run.status,
          retry: 2000,
          data: this.toResponse(run),
        }),
      ),
      takeWhile((event) => !this.isTerminalStatus(event.type), true),
    );
    const heartbeats = interval(15_000).pipe(
      map((): MessageEvent => ({ type: 'heartbeat', data: { runId } })),
      takeUntil(terminalRun),
    );
    return merge(statusEvents, heartbeats);
  }

  async cancelRun(userId: number, runId: string) {
    const run = await this.findUserRun(userId, runId);
    if (run.status === 'cancelled') {
      return {
        message: 'Assistant run already cancelled',
        data: this.toResponse(run),
      };
    }
    if (run.status === 'completed' || run.status === 'failed') {
      throw new BadRequestException(
        `A ${run.status} assistant run cannot be cancelled`,
      );
    }
    try {
      await this.execution.transition(run.id, {
        expectedStatuses: [run.status],
        status: 'cancelled',
        phase: 'terminal',
        eventType: 'run.cancelled',
        patch: { cancelledAt: new Date(), completedAt: new Date() },
      });
    } catch {
      const current = await this.findUserRun(userId, runId);
      if (current.status === 'cancelled') {
        return {
          message: 'Assistant run already cancelled',
          data: this.toResponse(current),
        };
      }
      throw new BadRequestException(
        `A ${current.status} assistant run cannot be cancelled`,
      );
    }
    this.handler.cancel(run.id);
    await this.removeQueuedJob(run);
    return {
      message: 'Assistant run cancelled successfully',
      data: this.toResponse(await this.findUserRun(userId, runId)),
    };
  }

  async resumeRun(userId: number, runId: string) {
    const run = await this.findUserRun(userId, runId);
    if (run.status !== 'suspended') {
      throw new BadRequestException('Assistant run is not suspended');
    }
    const continuation = await this.execution.getContinuation(runId);
    if (!continuation) {
      throw new BadRequestException(
        'Assistant run has no resumable continuation',
      );
    }
    const resumed = await this.execution.transition(runId, {
      expectedStatuses: ['suspended'],
      status: 'queued',
      phase: 'queued',
      eventType: 'browser.resume_requested',
      checkpointState: {
        continuation: true,
        dispatchState: continuation.dispatchState,
      },
    });
    await this.enqueue(
      runId,
      resumed.executionLane,
      `resume:${resumed.checkpointVersion}`,
    );
    return {
      message: 'Assistant run queued for browser resumption',
      data: this.toResponse(resumed),
    };
  }

  async findUserRun(userId: number, runId: string): Promise<Run> {
    const run = await this.repository.findOne({ where: { id: runId, userId } });
    if (!run) throw new NotFoundException('Assistant run not found');
    return run;
  }

  async assertQueueCapacity(manager: EntityManager, userId: number) {
    const queued = await manager.count(Run, {
      where: { userId, status: 'queued' },
    });
    if (queued >= MAX_QUEUED_RUNS_PER_USER) {
      throw new ConflictException(
        `A user can have at most ${MAX_QUEUED_RUNS_PER_USER} queued assistant runs`,
      );
    }
  }

  async enqueue(
    runId: string,
    lane: AssistantExecutionLane,
    resumeKey?: string,
  ): Promise<Job> {
    const jobId = resumeKey ? `${runId}:${resumeKey}` : runId;
    const job = await this.queueFor(lane).add(
      EXECUTE_JOB,
      { runId },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );
    await this.repository.update(runId, { queueJobId: jobId });
    return job;
  }

  async markQueueFailure(
    runId: string,
    error = 'Unable to queue assistant run',
  ) {
    await this.repository.update(runId, {
      status: 'failed',
      error,
      completedAt: new Date(),
    });
  }

  resolveExecutionLane(request: {
    executionLane?: AssistantExecutionLane;
    capability?: AssistantCapability;
    browserSessionId?: string;
    browserExecutionTarget?: 'extension' | 'managed';
  }): AssistantExecutionLane {
    if (request.executionLane) return request.executionLane;
    return request.browserExecutionTarget === 'managed' ||
      (request.capability === 'chat' && Boolean(request.browserSessionId))
      ? 'long'
      : 'short';
  }

  validateRequest(request: ExecuteDto): void {
    if (!request.context.selectedText && !request.context.pageContent) {
      throw new BadRequestException(
        'Selected text or page content is required',
      );
    }
    if (
      request.capability === 'translate' &&
      !request.options?.targetLanguage
    ) {
      throw new BadRequestException(
        'Target language is required for translation',
      );
    }
  }

  toResponse(run: Run) {
    return {
      id: run.id,
      conversationId: run.conversationId,
      capability: run.capability,
      executionLane: run.executionLane,
      status: run.status,
      phase: run.phase,
      result: run.result,
      error: run.error,
      provider: run.provider,
      model: run.model,
      usage:
        run.inputTokens !== undefined || run.outputTokens !== undefined
          ? {
              inputTokens: run.inputTokens || 0,
              outputTokens: run.outputTokens || 0,
            }
          : undefined,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
      startedAt: run.startedAt,
      queueWaitMs: run.queueWaitMs,
      completedAt: run.completedAt,
      cancelledAt: run.cancelledAt,
      execution: {
        modelCalls: run.modelCallCount,
        maxModelCalls: run.maxModelCalls,
        toolCalls: run.toolCallCount,
        maxToolCalls: run.maxToolCalls,
      },
    };
  }

  private async removeQueuedJob(run: Run) {
    const job = await this.queueFor(run.executionLane).getJob(
      run.queueJobId ?? run.id,
    );
    const state = await job?.getState();
    if (job && (state === 'waiting' || state === 'delayed')) {
      try {
        await job.remove();
      } catch {
        // The worker may acquire the job between checking and removing it.
      }
    }
  }

  private queueFor(lane: AssistantExecutionLane): Queue {
    return lane === 'long' ? this.longQueue : this.shortQueue;
  }

  private isTerminal(run: Run): boolean {
    return this.isTerminalStatus(run.status);
  }

  private isTerminalStatus(status?: string): boolean {
    return (
      status === 'completed' || status === 'failed' || status === 'cancelled'
    );
  }
}
