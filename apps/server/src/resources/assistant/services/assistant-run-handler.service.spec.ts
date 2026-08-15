import { DelayedError } from 'bullmq';
import type { Job } from 'bullmq';
import type { Repository } from 'typeorm';
import { LoopService } from '../../agent/services/loop.service';
import { AssistantRunHandler } from './assistant-run-handler.service';
import { Run } from '../../agent/entities/run.entity';
import type { ExecutionService } from '../../agent/services/execution.service';
import { BrowserToolApprovalRequiredError } from '../../tools/policy/browser-tool-approval.service';
import { BrowserToolApproval } from '../../tools/policy/browser-tool-approval.entity';
import { BrowserSessionUnavailableError } from '../../tools/executors/browser-execution.errors';

describe('AssistantRunHandler', () => {
  const run: Run = {
    id: '9d06cd75-e508-4d25-8a0d-a018863c2186',
    userId: 1,
    capability: 'summarize',
    executionLane: 'short',
    status: 'queued',
    context: {
      url: 'https://example.com',
      title: 'Example',
      selectedText: 'Content',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const manager = {
    transaction: jest.fn(),
    query: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };
  const runRepository = {
    manager,
    findOne: jest.fn(),
    update: jest.fn(),
  } as unknown as Repository<Run>;
  const agentLoop = {
    run: jest.fn(),
  } as unknown as LoopService;
  const execution = {
    transition: jest.fn().mockResolvedValue(undefined),
  } as unknown as ExecutionService;
  const processor = new AssistantRunHandler(
    runRepository,
    agentLoop,
    execution,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    manager.transaction.mockImplementation((callback) => callback(manager));
    manager.count.mockResolvedValue(0);
    manager.update.mockResolvedValue({ affected: 1 });
    jest
      .spyOn(runRepository, 'update')
      .mockResolvedValue({ affected: 1 } as never);
  });

  it('persists completion and provider usage metadata', async () => {
    jest
      .spyOn(runRepository, 'findOne')
      .mockResolvedValueOnce(run)
      .mockResolvedValueOnce({ ...run, status: 'running' });
    jest.spyOn(agentLoop, 'run').mockResolvedValue({
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
      content: 'Summary',
      usage: { inputTokens: 20, outputTokens: 5 },
    });
    const job = {
      name: 'execute-assistant',
      data: { runId: run.id },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as Job<{ runId: string }>;

    await processor.process(job, 'short');

    expect(execution.transition).toHaveBeenCalledWith(
      run.id,
      expect.objectContaining({
        status: 'completed',
        phase: 'terminal',
        patch: expect.objectContaining({
          result: 'Summary',
          provider: 'groq',
          model: 'llama-3.1-8b-instant',
          inputTokens: 20,
          outputTokens: 5,
        }),
      }),
    );
    expect(agentLoop.run).toHaveBeenCalled();
    expect(manager.update).toHaveBeenCalledWith(
      Run,
      { id: run.id, status: 'queued' },
      expect.objectContaining({
        status: 'running',
        queueWaitMs: expect.any(Number),
      }),
    );
  });

  it('delays a run when the user already has two active runs', async () => {
    jest.spyOn(runRepository, 'findOne').mockResolvedValue(run);
    manager.count.mockResolvedValue(2);
    const moveToDelayed = jest.fn().mockResolvedValue(undefined);
    const job = {
      name: 'execute-assistant',
      data: { runId: run.id },
      moveToDelayed,
    } as unknown as Job<{ runId: string }>;

    await expect(
      processor.process(job, 'short', 'worker-token'),
    ).rejects.toBeInstanceOf(DelayedError);
    expect(moveToDelayed).toHaveBeenCalledWith(
      expect.any(Number),
      'worker-token',
    );
    expect(agentLoop.run).not.toHaveBeenCalled();
  });

  it('uses the agent loop for chat runs', async () => {
    const chatRun = { ...run, capability: 'chat' as const };
    jest
      .spyOn(runRepository, 'findOne')
      .mockResolvedValueOnce(chatRun)
      .mockResolvedValueOnce({ ...chatRun, status: 'running' });
    jest.spyOn(agentLoop, 'run').mockResolvedValue({
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
      content: 'Done',
      usage: { inputTokens: 10, outputTokens: 2 },
    });
    const job = {
      name: 'execute-assistant',
      data: { runId: chatRun.id },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as Job<{ runId: string }>;

    await processor.process(job, 'short');

    expect(agentLoop.run).toHaveBeenCalledWith(
      chatRun,
      expect.any(Array),
      expect.any(AbortSignal),
    );
  });

  it('durably suspends a run when an action requires approval', async () => {
    const approval = {
      id: 'approval-1',
      toolName: 'browser_submit_form',
      arguments: { ref: 'form-1', documentRevision: 'revision-1' },
      expiresAt: new Date(Date.now() + 60_000),
    } as BrowserToolApproval;
    jest
      .spyOn(runRepository, 'findOne')
      .mockResolvedValueOnce(run)
      .mockResolvedValueOnce({ ...run, status: 'running' })
      .mockResolvedValueOnce({ ...run, status: 'running' });
    jest
      .spyOn(agentLoop, 'run')
      .mockRejectedValue(new BrowserToolApprovalRequiredError(approval));
    const job = {
      id: 'job-1',
      name: 'execute-assistant',
      data: { runId: run.id },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as Job<{ runId: string }>;

    await expect(processor.process(job, 'short')).resolves.toBeUndefined();

    expect(execution.transition).toHaveBeenCalledWith(
      run.id,
      expect.objectContaining({
        status: 'awaiting_approval',
        phase: 'awaiting_approval',
        eventType: 'approval.requested',
        checkpointState: { approvalId: approval.id },
      }),
    );
  });

  it('suspends instead of retrying when the browser disconnects', async () => {
    jest
      .spyOn(runRepository, 'findOne')
      .mockResolvedValueOnce(run)
      .mockResolvedValueOnce({ ...run, status: 'running' })
      .mockResolvedValueOnce({ ...run, status: 'running' });
    jest
      .spyOn(agentLoop, 'run')
      .mockRejectedValue(new BrowserSessionUnavailableError());
    const job = {
      id: 'job-1',
      name: 'execute-assistant',
      data: { runId: run.id },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as Job<{ runId: string }>;

    await expect(processor.process(job, 'short')).resolves.toBeUndefined();
    expect(execution.transition).toHaveBeenCalledWith(
      run.id,
      expect.objectContaining({
        status: 'suspended',
        phase: 'suspended',
        eventType: 'browser.suspended',
      }),
    );
  });
});
