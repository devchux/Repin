import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import type { AssistantRunHandler } from './assistant-run-handler.service';
import { AssistantService } from './assistant.service';
import { Run } from '../../agent/entities/run.entity';
import { AssistantConversation } from '../entities/conversation.entity';
import type { ExecutionService } from '../../agent/services/execution.service';
import type { BrowserToolApprovalService } from '../../tools/policy/browser-tool-approval.service';

describe('AssistantService', () => {
  const now = new Date();
  const run: Run = {
    id: '9d06cd75-e508-4d25-8a0d-a018863c2186',
    userId: 1,
    conversationId: '3b8f0241-a8a4-4f64-86dd-21ac7db99ea3',
    capability: 'summarize',
    executionLane: 'short',
    status: 'queued',
    context: {
      url: 'https://example.com/article',
      title: 'Example article',
      selectedText: 'Article content',
    },
    createdAt: now,
    updatedAt: now,
  };
  const manager = {
    transaction: jest.fn(),
    query: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };
  const runRepository = {
    manager,
    create: jest.fn((value) => value),
    save: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  } as unknown as Repository<Run>;
  const shortQueue = {
    add: jest.fn(),
    getJob: jest.fn(),
  } as unknown as Queue;
  const longQueue = {
    add: jest.fn(),
    getJob: jest.fn(),
  } as unknown as Queue;
  const runHandler = {
    cancel: jest.fn(),
  } as unknown as AssistantRunHandler;
  const execution = {
    transition: jest.fn().mockResolvedValue(undefined),
  } as unknown as ExecutionService;
  const approvals = {
    approve: jest.fn(),
    deny: jest.fn(),
  } as unknown as BrowserToolApprovalService;
  const service = new AssistantService(
    runRepository,
    shortQueue,
    longQueue,
    runHandler,
    execution,
    approvals,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    manager.transaction.mockImplementation((callback) => callback(manager));
    manager.count.mockResolvedValue(0);
    manager.create.mockImplementation((_entity, value) => value);
    manager.save.mockImplementation((_entity, value) =>
      Promise.resolve({
        id:
          value.initialCapability !== undefined
            ? run.conversationId
            : value.id || run.id,
        createdAt: now,
        updatedAt: now,
        ...value,
      }),
    );
    jest
      .spyOn(runRepository, 'update')
      .mockResolvedValue({ affected: 1 } as never);
  });

  it('persists and queues an assistant run', async () => {
    jest.spyOn(shortQueue, 'add').mockResolvedValue(undefined);

    await expect(
      service.createRun(1, {
        capability: 'summarize',
        context: run.context,
      }),
    ).resolves.toMatchObject({
      message: 'Assistant run queued successfully',
      data: { id: run.id, status: 'queued' },
    });
    expect(shortQueue.add).toHaveBeenCalledWith(
      'execute-assistant',
      { runId: run.id },
      expect.objectContaining({ jobId: run.id, attempts: 3 }),
    );
  });

  it('persists the selected browser executor on an initial run', async () => {
    jest.spyOn(longQueue, 'add').mockResolvedValue(undefined);

    await service.createRun(1, {
      capability: 'chat',
      context: run.context,
      browserSessionId: 'browser-session-1',
      browserExecutionTarget: 'managed',
    });

    expect(manager.create).toHaveBeenCalledWith(
      Run,
      expect.objectContaining({
        browserSessionId: 'browser-session-1',
        browserExecutionTarget: 'managed',
        executionLane: 'long',
      }),
    );
    expect(longQueue.add).toHaveBeenCalledWith(
      'execute-assistant',
      { runId: run.id },
      expect.objectContaining({ jobId: run.id }),
    );
    expect(shortQueue.add).not.toHaveBeenCalled();
    expect(manager.create).toHaveBeenCalledWith(
      AssistantConversation,
      expect.not.objectContaining({
        browserSessionId: expect.anything(),
        browserExecutionTarget: expect.anything(),
      }),
    );
  });

  it('rejects a user with ten queued runs', async () => {
    manager.count.mockResolvedValue(10);

    await expect(
      service.createRun(1, {
        capability: 'summarize',
        context: run.context,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(shortQueue.add).not.toHaveBeenCalled();
  });

  it('requires a target language for translation', async () => {
    await expect(
      service.createRun(1, {
        capability: 'translate',
        context: {
          url: 'https://example.com',
          title: 'Example',
          selectedText: 'Hello',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns only runs owned by the authenticated user', async () => {
    jest.spyOn(runRepository, 'findOne').mockResolvedValue(run);

    await expect(service.findRun(1, run.id)).resolves.toMatchObject({
      data: { id: run.id },
    });
    expect(runRepository.findOne).toHaveBeenCalledWith({
      where: { id: run.id, userId: 1 },
    });
  });

  it('queues a follow-up turn in the existing conversation', async () => {
    const conversation: AssistantConversation = {
      id: run.conversationId,
      userId: 1,
      initialCapability: 'explain',
      context: run.context,
      createdAt: now,
      updatedAt: now,
    };
    manager.findOne.mockResolvedValue(conversation);
    manager.count.mockResolvedValue(0);
    jest.spyOn(shortQueue, 'add').mockResolvedValue(undefined);

    await expect(
      service.createConversationMessage(1, conversation.id, {
        content: 'Can you give me an example?',
      }),
    ).resolves.toMatchObject({
      message: 'Conversation message queued successfully',
      data: { conversationId: conversation.id, capability: 'chat' },
    });
    expect(manager.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        conversationId: conversation.id,
        role: 'user',
        content: 'Can you give me an example?',
      }),
    );
  });

  it('rejects a second turn while the conversation has a pending run', async () => {
    manager.findOne.mockResolvedValue({
      id: run.conversationId,
      userId: 1,
    });
    manager.count.mockResolvedValueOnce(1);

    await expect(
      service.createConversationMessage(1, run.conversationId, {
        content: 'Another question',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('streams a completed run with its result', async () => {
    const completedRun = {
      ...run,
      status: 'completed' as const,
      result: 'A short summary',
      completedAt: now,
    };
    jest.spyOn(runRepository, 'findOne').mockResolvedValue(completedRun);

    const stream = await service.watchRun(1, run.id);
    const event = await firstValueFrom(stream);

    expect(event).toMatchObject({
      type: 'completed',
      data: {
        id: run.id,
        status: 'completed',
        result: 'A short summary',
      },
    });
  });

  it('cancels a queued run and removes its queue job', async () => {
    const cancelledRun = {
      ...run,
      status: 'cancelled' as const,
      cancelledAt: now,
      completedAt: now,
    };
    const remove = jest.fn();
    jest
      .spyOn(runRepository, 'findOne')
      .mockResolvedValueOnce(run)
      .mockResolvedValueOnce(cancelledRun);
    jest.spyOn(shortQueue, 'getJob').mockResolvedValue({
      getState: jest.fn().mockResolvedValue('waiting'),
      remove,
    } as never);

    await expect(service.cancelRun(1, run.id)).resolves.toMatchObject({
      data: { id: run.id, status: 'cancelled' },
    });
    expect(runHandler.cancel).toHaveBeenCalledWith(run.id);
    expect(remove).toHaveBeenCalled();
  });

  it('resumes an awaiting run after an exact action is approved', async () => {
    const awaitingRun = {
      ...run,
      status: 'awaiting_approval' as const,
      phase: 'awaiting_approval' as const,
    };
    jest.spyOn(runRepository, 'findOne').mockResolvedValue(awaitingRun);
    jest.spyOn(approvals, 'approve').mockResolvedValue({
      id: '9d06cd75-e508-4d25-8a0d-a018863c2187',
      actionFingerprint: 'fingerprint-1',
    } as never);
    jest.spyOn(execution, 'transition').mockResolvedValue({
      ...awaitingRun,
      status: 'queued',
      phase: 'queued',
    });
    jest.spyOn(shortQueue, 'add').mockResolvedValue(undefined);

    await expect(
      service.approveAction(
        run.userId,
        run.id,
        '9d06cd75-e508-4d25-8a0d-a018863c2187',
      ),
    ).resolves.toMatchObject({
      data: { id: run.id, status: 'queued' },
    });
    expect(shortQueue.add).toHaveBeenCalledWith(
      'execute-assistant',
      { runId: run.id },
      expect.objectContaining({
        jobId: `${run.id}:approval:9d06cd75-e508-4d25-8a0d-a018863c2187`,
      }),
    );
  });
});
