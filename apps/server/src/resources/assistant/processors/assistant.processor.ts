import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DelayedError } from 'bullmq';
import type { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { AssistantAgentLoop } from '../services/assistant-agent-loop.service';
import { AiService } from '../../ai/ai.service';
import {
  createAssistantMessages,
  createConversationMessages,
} from '../assistant.prompts';
import {
  ASSISTANT_INTERACTIVE_QUEUE,
  ASSISTANT_MAX_ACTIVE_RUNS_PER_USER,
  ASSISTANT_USER_SLOT_RETRY_DELAY,
  ASSISTANT_WORKER_CONCURRENCY,
  EXECUTE_ASSISTANT_JOB,
} from '../assistant.constants';
import { AssistantRun } from '../entities/run.entity';
import { AssistantConversation } from '../entities/conversation.entity';
import { AssistantConversationMessage } from '../entities/conversation-message.entity';
import {
  AssistantBudgetExceededError,
  AssistantExecutionService,
  AssistantLoopDetectedError,
} from '../services/assistant-execution.service';
import { BrowserToolApprovalRequiredError } from '../../tools/policy/browser-tool-approval.service';
import {
  BrowserCommandOutcomeUnknownError,
  BrowserSessionUnavailableError,
} from '../../tools/executors/browser-execution.errors';

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
    private readonly agentLoop: AssistantAgentLoop,
    private readonly aiService: AiService,
    private readonly execution: AssistantExecutionService,
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
            phase: 'initializing',
            startedAt,
            queueWaitMs: Math.max(
              0,
              startedAt.getTime() - run.createdAt.getTime(),
            ),
            queueJobId: null,
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
      await this.execution.transition(run.id, {
        expectedStatuses: ['running'],
        status: 'running',
        phase: 'reasoning',
        eventType: 'run.started',
        checkpointState: { queueJobId: String(job.id ?? '') },
      });
      const messages = await this.createMessages(run);
      const result = await this.agentLoop.run(
        run,
        messages,
        abortController.signal,
      );
      const currentRun = await this.runRepository.findOne({
        where: { id: run.id },
      });

      if (currentRun?.status === 'cancelled') {
        return;
      }

      await this.execution.transition(run.id, {
        expectedStatuses: ['running'],
        status: 'completed',
        phase: 'terminal',
        eventType: 'run.completed',
        checkpointState: { result: result.content },
        patch: {
          result: result.content,
          provider: result.provider,
          model: result.model,
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
          completedAt: new Date(),
        },
      });
      await this.runRepository.manager.transaction(async (manager) => {
        if (run.conversationId) {
          await manager.save(
            AssistantConversationMessage,
            manager.create(AssistantConversationMessage, {
              conversationId: run.conversationId,
              runId: run.id,
              role: 'assistant',
              content: result.content,
            }),
          );
          await manager.update(AssistantConversation, run.conversationId, {
            updatedAt: new Date(),
          });
        }
      });
    } catch (error) {
      const currentRun = await this.runRepository.findOne({
        where: { id: run.id },
      });

      if (
        error instanceof BrowserToolApprovalRequiredError &&
        currentRun?.status !== 'cancelled'
      ) {
        await this.execution.transition(run.id, {
          expectedStatuses: ['running'],
          status: 'awaiting_approval',
          phase: 'awaiting_approval',
          eventType: 'approval.requested',
          eventData: {
            approvalId: error.approval.id,
            toolName: error.approval.toolName,
            arguments: error.approval.arguments,
            expiresAt: error.approval.expiresAt.toISOString(),
          },
          checkpointState: { approvalId: error.approval.id },
        });
        return;
      }

      if (
        (error instanceof BrowserSessionUnavailableError ||
          error instanceof BrowserCommandOutcomeUnknownError) &&
        currentRun?.status !== 'cancelled'
      ) {
        await this.execution.transition(run.id, {
          expectedStatuses: ['running'],
          status: 'suspended',
          phase: 'suspended',
          eventType: 'browser.suspended',
          eventData: {
            reason: error.message,
            outcomeUnknown: error instanceof BrowserCommandOutcomeUnknownError,
          },
          checkpointState: { continuation: true },
        });
        return;
      }

      if (currentRun?.status !== 'cancelled') {
        const finalAttempt =
          error instanceof AssistantBudgetExceededError ||
          error instanceof AssistantLoopDetectedError ||
          job.attemptsMade + 1 >= (job.opts.attempts || 1);
        await this.execution.transition(run.id, {
          expectedStatuses: ['running'],
          status: finalAttempt ? 'failed' : 'queued',
          phase: finalAttempt ? 'terminal' : 'queued',
          eventType: finalAttempt ? 'run.failed' : 'run.retry_scheduled',
          eventData: {
            error: error instanceof Error ? error.message : 'Unknown AI error',
          },
          patch: {
            error: error instanceof Error ? error.message : 'Unknown AI error',
            completedAt: finalAttempt ? new Date() : null,
          },
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

  private async createMessages(run: AssistantRun) {
    if (!run.conversationId) {
      return createAssistantMessages(run);
    }

    const conversation = await this.runRepository.manager.findOne(
      AssistantConversation,
      { where: { id: run.conversationId, userId: run.userId } },
    );
    if (!conversation) {
      throw new Error('Assistant conversation not found');
    }

    const history = await this.runRepository.manager.find(
      AssistantConversationMessage,
      {
        where: { conversationId: conversation.id },
        order: { createdAt: 'DESC' },
        take: 20,
      },
    );
    const hasPreviousAssistantResponse = history.some(
      (message) => message.role === 'assistant',
    );

    return hasPreviousAssistantResponse
      ? createConversationMessages(conversation, history.reverse())
      : createAssistantMessages(run);
  }
}
