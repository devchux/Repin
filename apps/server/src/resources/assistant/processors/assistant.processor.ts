import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DelayedError } from 'bullmq';
import type { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { AiService } from '../../ai/ai.service';
import { createAssistantMessages } from '../assistant.prompts';
import {
  ASSISTANT_INTERACTIVE_QUEUE,
  ASSISTANT_MAX_ACTIVE_RUNS_PER_USER,
  ASSISTANT_USER_SLOT_RETRY_DELAY,
  ASSISTANT_WORKER_CONCURRENCY,
  EXECUTE_ASSISTANT_JOB,
} from '../assistant.constants';
import { AssistantRun } from '../entities/run.entity';

interface AssistantJobData {
  runId: string;
}

@Injectable()
@Processor(ASSISTANT_INTERACTIVE_QUEUE, {
  concurrency: ASSISTANT_WORKER_CONCURRENCY,
})
export class AssistantProcessor extends WorkerHost {
  private readonly activeRuns = new Map<string, AbortController>();

  constructor(
    @InjectRepository(AssistantRun)
    private readonly runRepository: Repository<AssistantRun>,
    private readonly aiService: AiService,
  ) {
    super();
  }

  async process(job: Job<AssistantJobData>, token?: string): Promise<void> {
    if (job.name !== EXECUTE_ASSISTANT_JOB) {
      throw new Error(`Unsupported assistant job: ${job.name}`);
    }

    const run = await this.runRepository.findOne({
      where: { id: job.data.runId },
    });

    if (!run || run.status === 'cancelled') {
      return;
    }

    const startedAt = new Date();
    const started = await this.runRepository.manager.transaction(
      async (manager) => {
        await manager.query('SELECT pg_advisory_xact_lock($1)', [run.userId]);
        const activeRuns = await manager.count(AssistantRun, {
          where: { userId: run.userId, status: 'running' },
        });

        if (activeRuns >= ASSISTANT_MAX_ACTIVE_RUNS_PER_USER) {
          return false;
        }

        const startResult = await manager.update(
          AssistantRun,
          { id: run.id, status: 'queued' },
          {
            status: 'running',
            startedAt,
            queueWaitMs: Math.max(
              0,
              startedAt.getTime() - run.createdAt.getTime(),
            ),
            error: null,
          },
        );

        return startResult.affected !== 0;
      },
    );

    if (!started) {
      await job.moveToDelayed(
        Date.now() + ASSISTANT_USER_SLOT_RETRY_DELAY,
        token,
      );
      throw new DelayedError();
    }

    const abortController = new AbortController();
    this.activeRuns.set(run.id, abortController);

    const currentRun = await this.runRepository.findOne({
      where: { id: run.id },
    });
    if (currentRun?.status === 'cancelled') {
      this.activeRuns.delete(run.id);
      return;
    }

    try {
      const result = await this.aiService.generate({
        messages: createAssistantMessages(run),
        signal: abortController.signal,
      });
      const currentRun = await this.runRepository.findOne({
        where: { id: run.id },
      });

      if (currentRun?.status === 'cancelled') {
        return;
      }

      await this.runRepository.update(run.id, {
        status: 'completed',
        result: result.content,
        provider: result.provider,
        model: result.model,
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
        completedAt: new Date(),
      });
    } catch (error) {
      const currentRun = await this.runRepository.findOne({
        where: { id: run.id },
      });

      if (currentRun?.status !== 'cancelled') {
        const finalAttempt = job.attemptsMade + 1 >= (job.opts.attempts || 1);
        await this.runRepository.update(run.id, {
          status: finalAttempt ? 'failed' : 'queued',
          error: error instanceof Error ? error.message : 'Unknown AI error',
          completedAt: finalAttempt ? new Date() : null,
        });
      }

      throw error;
    } finally {
      this.activeRuns.delete(run.id);
    }
  }

  cancel(runId: string): void {
    this.activeRuns.get(runId)?.abort();
  }
}
