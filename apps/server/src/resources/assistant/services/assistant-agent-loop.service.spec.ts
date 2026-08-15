import type { AiService } from '../../ai/ai.service';
import type { ToolsService } from '../../tools/tools.service';
import { AssistantAgentLoop } from './assistant-agent-loop.service';
import type { AssistantRun } from '../entities/run.entity';
import type { AssistantExecutionService } from './assistant-execution.service';

const run = {
  id: 'run-1',
  userId: 9,
  browserSessionId: 'browser-session-1',
} as AssistantRun;

describe('AssistantAgentLoop', () => {
  const execution = {
    transition: jest.fn().mockResolvedValue(undefined),
    startStep: jest.fn().mockResolvedValue({ id: 'step-1' }),
    completeStep: jest.fn().mockResolvedValue(undefined),
    failStep: jest.fn().mockResolvedValue(undefined),
  } as unknown as AssistantExecutionService;

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
    const loop = new AssistantAgentLoop(aiService, toolsService, execution);

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

    const result = await new AssistantAgentLoop(
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
});
