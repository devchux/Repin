import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import type { Queue } from 'bullmq';
import { In, Repository } from 'typeorm';
import type { MessageEvent } from '@nestjs/common';
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
import {
  ASSISTANT_INTERACTIVE_QUEUE,
  ASSISTANT_MAX_QUEUED_RUNS_PER_USER,
  EXECUTE_ASSISTANT_JOB,
} from '../assistant.constants';
import { AssistantProcessor } from '../processors/assistant.processor';
import { ExecuteAssistantDto } from '../dto/execute-assistant.dto';
import { AssistantRun } from '../entities/run.entity';
import { AssistantConversation } from '../entities/conversation.entity';
import { AssistantConversationMessage } from '../entities/conversation-message.entity';
import { CreateConversationMessageDto } from '../dto/create-conversation-message.dto';
import { AssistantExecutionService } from './assistant-execution.service';
import { BrowserToolApprovalService } from '../../tools/policy/browser-tool-approval.service';

@Injectable()
export class AssistantService {
  constructor(
    @InjectRepository(AssistantRun)
    private readonly runRepository: Repository<AssistantRun>,
    @InjectQueue(ASSISTANT_INTERACTIVE_QUEUE)
    private readonly assistantQueue: Queue,
    private readonly assistantProcessor: AssistantProcessor,
    private readonly execution: AssistantExecutionService,
    private readonly approvals: BrowserToolApprovalService,
  ) {}

  async createRun(userId: number, request: ExecuteAssistantDto) {
    this.validateRequest(request);

    const run = await this.runRepository.manager.transaction(
      async (manager) => {
        await manager.query('SELECT pg_advisory_xact_lock($1)', [userId]);
        const queuedRuns = await manager.count(AssistantRun, {
          where: { userId, status: 'queued' },
        });

        if (queuedRuns >= ASSISTANT_MAX_QUEUED_RUNS_PER_USER) {
          throw new ConflictException(
            `A user can have at most ${ASSISTANT_MAX_QUEUED_RUNS_PER_USER} queued assistant runs`,
          );
        }

        const conversation = await manager.save(
          AssistantConversation,
          manager.create(AssistantConversation, {
            userId,
            initialCapability: request.capability,
            context: request.context,
            options: request.options,
          }),
        );
        const run = await manager.save(
          AssistantRun,
          manager.create(AssistantRun, {
            userId,
            conversationId: conversation.id,
            capability: request.capability,
            context: request.context,
            input: request.input,
            options: request.options,
            browserSessionId: request.browserSessionId,
            browserExecutionTarget:
              request.browserExecutionTarget ?? 'extension',
            status: 'queued',
          }),
        );

        if (request.input?.trim()) {
          await manager.save(
            AssistantConversationMessage,
            manager.create(AssistantConversationMessage, {
              conversationId: conversation.id,
              runId: run.id,
              role: 'user',
              content: request.input.trim(),
            }),
          );
        }

        return run;
      },
    );

    try {
      await this.enqueueRun(run.id);
    } catch {
      await this.runRepository.update(run.id, {
        status: 'failed',
        error: 'Unable to queue assistant run',
        completedAt: new Date(),
      });
      throw new ServiceUnavailableException('Unable to queue assistant run');
    }

    return {
      message: 'Assistant run queued successfully',
      data: this.toResponse(run),
    };
  }

  async findConversation(userId: number, conversationId: string) {
    const conversation = await this.findUserConversation(
      userId,
      conversationId,
    );
    const messages = await this.runRepository.manager.find(
      AssistantConversationMessage,
      {
        where: { conversationId },
        order: { createdAt: 'ASC' },
      },
    );

    return {
      message: 'Assistant conversation found successfully',
      data: {
        id: conversation.id,
        initialCapability: conversation.initialCapability,
        context: conversation.context,
        messages: messages.map((message) => ({
          id: message.id,
          runId: message.runId,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt,
        })),
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    };
  }

  async createConversationMessage(
    userId: number,
    conversationId: string,
    request: CreateConversationMessageDto,
  ) {
    const content = request.content.trim();
    const run = await this.runRepository.manager.transaction(
      async (manager) => {
        await manager.query('SELECT pg_advisory_xact_lock($1)', [userId]);
        const conversation = await manager.findOne(AssistantConversation, {
          where: { id: conversationId, userId },
        });

        if (!conversation) {
          throw new NotFoundException('Assistant conversation not found');
        }

        const pendingTurn = await manager.count(AssistantRun, {
          where: {
            conversationId,
            status: In(['queued', 'running', 'awaiting_approval', 'suspended']),
          },
        });
        if (pendingTurn > 0) {
          throw new ConflictException(
            'Wait for the current conversation response before sending another message',
          );
        }

        const queuedRuns = await manager.count(AssistantRun, {
          where: { userId, status: 'queued' },
        });
        if (queuedRuns >= ASSISTANT_MAX_QUEUED_RUNS_PER_USER) {
          throw new ConflictException(
            `A user can have at most ${ASSISTANT_MAX_QUEUED_RUNS_PER_USER} queued assistant runs`,
          );
        }

        const newRun = await manager.save(
          AssistantRun,
          manager.create(AssistantRun, {
            userId,
            conversationId,
            capability: 'chat',
            context: conversation.context,
            input: content,
            options: conversation.options,
            browserSessionId: request.browserSessionId,
            browserExecutionTarget:
              request.browserExecutionTarget ?? 'extension',
            status: 'queued',
          }),
        );
        await manager.save(
          AssistantConversationMessage,
          manager.create(AssistantConversationMessage, {
            conversationId,
            runId: newRun.id,
            role: 'user',
            content,
          }),
        );
        await manager.update(AssistantConversation, conversationId, {
          updatedAt: new Date(),
        });

        return newRun;
      },
    );

    try {
      await this.enqueueRun(run.id);
    } catch {
      await this.runRepository.update(run.id, {
        status: 'failed',
        error: 'Unable to queue assistant run',
        completedAt: new Date(),
      });
      throw new ServiceUnavailableException('Unable to queue assistant run');
    }

    return {
      message: 'Conversation message queued successfully',
      data: this.toResponse(run),
    };
  }

  async findRun(userId: number, runId: string) {
    const run = await this.findUserRun(userId, runId);

    return {
      message: 'Assistant run found successfully',
      data: this.toResponse(run),
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
      map(
        (): MessageEvent => ({
          type: 'heartbeat',
          data: { runId },
        }),
      ),
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
        patch: {
          cancelledAt: new Date(),
          completedAt: new Date(),
        },
      });
    } catch {
      const currentRun = await this.findUserRun(userId, runId);
      if (currentRun.status === 'cancelled') {
        return {
          message: 'Assistant run already cancelled',
          data: this.toResponse(currentRun),
        };
      }
      throw new BadRequestException(
        `A ${currentRun.status} assistant run cannot be cancelled`,
      );
    }
    this.assistantProcessor.cancel(run.id);

    const job = await this.assistantQueue.getJob(run.queueJobId ?? run.id);
    const jobState = await job?.getState();
    if (job && (jobState === 'waiting' || jobState === 'delayed')) {
      try {
        await job.remove();
      } catch {
        // The worker may have acquired the job between checking and removing it.
      }
    }

    const cancelledRun = await this.findUserRun(userId, runId);

    return {
      message: 'Assistant run cancelled successfully',
      data: this.toResponse(cancelledRun),
    };
  }

  async approveAction(userId: number, runId: string, approvalId: string) {
    const run = await this.findUserRun(userId, runId);
    if (run.status !== 'awaiting_approval') {
      throw new BadRequestException('Assistant run is not awaiting approval');
    }
    const approval = await this.approvals.approve(userId, runId, approvalId);
    const resumedRun = await this.execution.transition(runId, {
      expectedStatuses: ['awaiting_approval'],
      status: 'queued',
      phase: 'queued',
      eventType: 'approval.approved',
      eventData: { approvalId },
      checkpointState: {
        approvedActionFingerprint: approval.actionFingerprint,
      },
      patch: { error: null },
    });
    try {
      await this.enqueueRun(runId, `approval:${approvalId}`);
    } catch {
      await this.execution.transition(runId, {
        expectedStatuses: ['queued'],
        status: 'failed',
        phase: 'terminal',
        eventType: 'run.resume_failed',
        patch: {
          error: 'Unable to resume approved assistant run',
          completedAt: new Date(),
        },
      });
      throw new ServiceUnavailableException(
        'Unable to resume approved assistant run',
      );
    }
    return {
      message: 'Browser action approved and run resumed',
      data: this.toResponse(resumedRun),
    };
  }

  async findPendingApprovals(userId: number, runId: string) {
    await this.findUserRun(userId, runId);
    const approvals = await this.approvals.findPending(userId, runId);
    return {
      message: 'Pending browser action approvals found',
      data: approvals.map((approval) => ({
        id: approval.id,
        toolName: approval.toolName,
        arguments: approval.arguments,
        effect: approval.effect,
        reason: approval.reason,
        expiresAt: approval.expiresAt,
        createdAt: approval.createdAt,
      })),
    };
  }

  async denyAction(userId: number, runId: string, approvalId: string) {
    const run = await this.findUserRun(userId, runId);
    if (run.status !== 'awaiting_approval') {
      throw new BadRequestException('Assistant run is not awaiting approval');
    }
    await this.approvals.deny(userId, runId, approvalId);
    const failedRun = await this.execution.transition(runId, {
      expectedStatuses: ['awaiting_approval'],
      status: 'failed',
      phase: 'terminal',
      eventType: 'approval.denied',
      eventData: { approvalId },
      patch: {
        error: 'User denied the proposed browser action',
        completedAt: new Date(),
      },
    });
    return {
      message: 'Browser action denied',
      data: this.toResponse(failedRun),
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
    const resumedRun = await this.execution.transition(runId, {
      expectedStatuses: ['suspended'],
      status: 'queued',
      phase: 'queued',
      eventType: 'browser.resume_requested',
      checkpointState: {
        continuation: true,
        dispatchState: continuation.dispatchState,
      },
    });
    await this.enqueueRun(runId, `resume:${resumedRun.checkpointVersion}`);
    return {
      message: 'Assistant run queued for browser resumption',
      data: this.toResponse(resumedRun),
    };
  }

  private async findUserRun(
    userId: number,
    runId: string,
  ): Promise<AssistantRun> {
    const run = await this.runRepository.findOne({
      where: { id: runId, userId },
    });

    if (!run) {
      throw new NotFoundException('Assistant run not found');
    }

    return run;
  }

  private async findUserConversation(
    userId: number,
    conversationId: string,
  ): Promise<AssistantConversation> {
    const conversation = await this.runRepository.manager.findOne(
      AssistantConversation,
      { where: { id: conversationId, userId } },
    );

    if (!conversation) {
      throw new NotFoundException('Assistant conversation not found');
    }

    return conversation;
  }

  private async enqueueRun(runId: string, resumeKey?: string) {
    const jobId = resumeKey ? `${runId}:${resumeKey}` : runId;
    const job = await this.assistantQueue.add(
      EXECUTE_ASSISTANT_JOB,
      { runId },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );
    await this.runRepository.update(runId, { queueJobId: jobId });
    return job;
  }

  private validateRequest(request: ExecuteAssistantDto): void {
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

  private isTerminal(run: AssistantRun): boolean {
    return this.isTerminalStatus(run.status);
  }

  private isTerminalStatus(status?: string): boolean {
    return (
      status === 'completed' || status === 'failed' || status === 'cancelled'
    );
  }

  private toResponse(run: AssistantRun) {
    return {
      id: run.id,
      conversationId: run.conversationId,
      capability: run.capability,
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
}
