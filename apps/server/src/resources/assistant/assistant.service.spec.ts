import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { Repository } from 'typeorm';
import { AssistantProcessor } from './processors/assistant.processor';
import { AssistantService } from './services/assistant.service';
import { Run } from '../agent/entities/run.entity';
import type { ExecutionService } from '../agent/services/execution.service';
import type { BrowserToolApprovalService } from '../tools/policy/browser-tool-approval.service';

describe('AssistantService', () => {
  const now = new Date();
  const run: Run = {
    id: '9d06cd75-e508-4d25-8a0d-a018863c2186',
    userId: 1,
    capability: 'summarize',
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
  };
  const runRepository = {
    manager,
    create: jest.fn((value) => value),
    save: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  } as unknown as Repository<Run>;
  const queue = {
    add: jest.fn(),
    getJob: jest.fn(),
  } as unknown as Queue;
  const processor = {
    cancel: jest.fn(),
  } as unknown as AssistantProcessor;
  const execution = {
    transition: jest.fn().mockResolvedValue(undefined),
  } as unknown as ExecutionService;
  const approvals = {
    approve: jest.fn(),
    deny: jest.fn(),
  } as unknown as BrowserToolApprovalService;
  const service = new AssistantService(
    runRepository,
    queue,
    processor,
    execution,
    approvals,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    manager.transaction.mockImplementation((callback) => callback(manager));
    manager.count.mockResolvedValue(0);
    manager.create.mockReturnValue(run);
    manager.save.mockResolvedValue(run);
    jest
      .spyOn(runRepository, 'update')
      .mockResolvedValue({ affected: 1 } as never);
  });

  it('persists and queues an assistant run', async () => {
    jest.spyOn(queue, 'add').mockResolvedValue(undefined);

    await expect(
      service.createRun(1, {
        capability: 'summarize',
        context: run.context,
      }),
    ).resolves.toMatchObject({
      message: 'Assistant run queued successfully',
      data: { id: run.id, status: 'queued' },
    });
    expect(queue.add).toHaveBeenCalledWith(
      'execute-assistant',
      { runId: run.id },
      expect.objectContaining({ jobId: run.id, attempts: 3 }),
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
    expect(queue.add).not.toHaveBeenCalled();
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
    jest.spyOn(queue, 'getJob').mockResolvedValue({
      getState: jest.fn().mockResolvedValue('waiting'),
      remove,
    } as never);

    await expect(service.cancelRun(1, run.id)).resolves.toMatchObject({
      data: { id: run.id, status: 'cancelled' },
    });
    expect(processor.cancel).toHaveBeenCalledWith(run.id);
    expect(remove).toHaveBeenCalled();
  });
});
