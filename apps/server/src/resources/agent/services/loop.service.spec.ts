import type { AiService } from '../../ai/ai.service';
import type { ToolsService } from '../../tools/tools.service';
import { LoopService } from './loop.service';
import type { Run } from '../entities/run.entity';
import type { ExecutionService } from './execution.service';

const run = {
  id: 'run-1',
  userId: 9,
  browserSessionId: 'browser-session-1',
} as Run;

describe('LoopService', () => {
  const execution = {
    transition: jest.fn().mockResolvedValue(undefined),
    startStep: jest.fn().mockResolvedValue({ id: 'step-1' }),
    completeStep: jest.fn().mockResolvedValue(undefined),
    failStep: jest.fn().mockResolvedValue(undefined),
    getContinuation: jest.fn().mockResolvedValue(null),
    saveContinuation: jest.fn().mockResolvedValue(undefined),
    markContinuation: jest.fn().mockResolvedValue(undefined),
    clearContinuation: jest.fn().mockResolvedValue(undefined),
  } as unknown as ExecutionService;

  beforeEach(() => jest.clearAllMocks());

  it('executes tool calls and returns the final model response', async () => {
    const aiService = {
      generate: jest
        .fn()
        .mockResolvedValueOnce({
          provider: 'test',
          model: 'model-1',
          content: '',
          toolCalls: [
            {
              id: 'call-1',
              name: 'browser_list_tabs',
              arguments: {},
            },
          ],
          usage: { inputTokens: 10, outputTokens: 2 },
        })
        .mockResolvedValueOnce({
          provider: 'test',
          model: 'model-1',
          content: 'There is one tab open.',
          toolCalls: [],
          usage: { inputTokens: 15, outputTokens: 5 },
        }),
    } as unknown as AiService;
    const toolsService = {
      getDefinitions: jest.fn().mockReturnValue([
        {
          name: 'browser_list_tabs',
          description: 'List tabs',
          inputSchema: { type: 'object' },
        },
      ]),
      supports: jest.fn().mockReturnValue(true),
      execute: jest.fn().mockResolvedValue([
        {
          id: 'tab-1',
          windowId: 'window-1',
          active: true,
          pinned: false,
        },
      ]),
    } as unknown as ToolsService;
    const loop = new LoopService(aiService, toolsService, execution);

    const result = await loop.run(run, [
      { role: 'user', content: 'List tabs' },
    ]);

    expect(result.content).toBe('There is one tab open.');
    expect(result.usage).toEqual({ inputTokens: 25, outputTokens: 7 });
    expect(toolsService.execute).toHaveBeenCalledWith(
      { name: 'browser_list_tabs', arguments: {} },
      expect.objectContaining({
        userId: 9,
        runId: 'run-1',
        browserSessionId: 'browser-session-1',
      }),
    );
    expect(aiService.generate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'assistant',
            toolCalls: expect.any(Array),
          }),
          expect.objectContaining({
            role: 'tool',
            toolCallId: 'call-1',
            content: expect.stringContaining('"success":true'),
          }),
        ]),
      }),
    );
  });

  it('returns tool errors to the model for recovery', async () => {
    const aiService = {
      generate: jest
        .fn()
        .mockResolvedValueOnce({
          provider: 'test',
          model: 'model',
          content: '',
          toolCalls: [{ id: 'call-1', name: 'unknown_tool', arguments: {} }],
        })
        .mockResolvedValueOnce({
          provider: 'test',
          model: 'model',
          content: 'I cannot do that.',
        }),
    } as unknown as AiService;
    const toolsService = {
      getDefinitions: jest.fn().mockReturnValue([]),
      supports: jest.fn().mockReturnValue(false),
      execute: jest.fn(),
    } as unknown as ToolsService;

    const result = await new LoopService(
      aiService,
      toolsService,
      execution,
    ).run(run, []);

    expect(result.content).toBe('I cannot do that.');
    expect(aiService.generate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'tool',
            content: expect.stringContaining('Unsupported browser tool'),
          }),
        ]),
      }),
    );
  });

  it('resumes the exact pending tool call with its idempotency key', async () => {
    jest.spyOn(execution, 'getContinuation').mockResolvedValueOnce({
      runId: run.id,
      iteration: 1,
      messages: [
        { role: 'user', content: 'List tabs' },
        {
          role: 'assistant',
          content: '',
          toolCalls: [
            {
              id: 'call-resume',
              name: 'browser_list_tabs',
              arguments: {},
            },
          ],
        },
      ],
      pendingToolCalls: [
        {
          id: 'call-resume',
          name: 'browser_list_tabs',
          arguments: {},
        },
      ],
      idempotencyKey: '9d06cd75-e508-4d25-8a0d-a018863c2188',
      dispatchState: 'prepared',
    } as never);
    const aiService = {
      generate: jest.fn().mockResolvedValue({
        provider: 'test',
        model: 'model',
        content: 'Resumed successfully.',
      }),
    } as unknown as AiService;
    const toolsService = {
      getDefinitions: jest.fn().mockReturnValue([]),
      supports: jest.fn().mockReturnValue(true),
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as ToolsService;

    const result = await new LoopService(
      aiService,
      toolsService,
      execution,
    ).run(run, []);

    expect(result.content).toBe('Resumed successfully.');
    expect(toolsService.execute).toHaveBeenCalledWith(
      { name: 'browser_list_tabs', arguments: {} },
      expect.objectContaining({
        idempotencyKey: '9d06cd75-e508-4d25-8a0d-a018863c2188',
      }),
    );
  });
});
