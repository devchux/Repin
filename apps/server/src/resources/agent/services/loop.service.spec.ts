import type { AiService } from '../../ai/ai.service';
import type { AiGenerateOptions } from '../../ai/types/provider';
import type { ToolsService } from '../../tools/services/tools.service';
import { LoopService } from './loop.service';
import type { Run } from '../entities/run.entity';
import type { ExecutionService } from './execution.service';
import type { MemoryService } from '../../memory/services/memory.service';
import type { MemoryToolsService } from '../../memory/services/tools.service';
import type { ConfigService } from '@nestjs/config';
import type { Configuration } from '../../../shared/types';

const run = {
  id: 'run-1',
  userId: 9,
  browserSessionId: 'browser-session-1',
  context: { url: 'https://docs.example.com/guide', title: 'Guide' },
} as Run;

describe('LoopService', () => {
  const execution = {
    transition: jest.fn().mockResolvedValue(undefined),
    startStep: jest.fn().mockResolvedValue({ id: 'step-1' }),
    completeStep: jest.fn().mockResolvedValue(undefined),
    assertToolResultProgress: jest.fn().mockResolvedValue(undefined),
    failStep: jest.fn().mockResolvedValue(undefined),
    getContinuation: jest.fn().mockResolvedValue(null),
    saveContinuation: jest.fn().mockResolvedValue(undefined),
    markContinuation: jest.fn().mockResolvedValue(undefined),
    clearContinuation: jest.fn().mockResolvedValue(undefined),
    recordEvent: jest.fn().mockResolvedValue(undefined),
    publishLiveEvent: jest.fn(),
    closeLiveEvents: jest.fn(),
  } as unknown as ExecutionService;
  const memoryService = {
    getContext: jest.fn().mockResolvedValue([]),
  } as unknown as MemoryService;
  const memoryTools = {
    getDefinitions: jest.fn().mockReturnValue([]),
    supports: jest.fn().mockReturnValue(false),
    execute: jest.fn(),
  } as unknown as MemoryToolsService;

  beforeEach(() => jest.clearAllMocks());

  it('records streamed assistant text as durable delta events', async () => {
    const aiService = {
      generate: jest
        .fn()
        .mockImplementation(async (options: AiGenerateOptions) => {
          await options.onTextDelta?.('Hello');
          await options.onTextDelta?.(' from Repin');
          return {
            provider: 'test',
            model: 'model',
            content: 'Hello from Repin',
          };
        }),
    } as unknown as AiService;
    const toolsService = {
      getDefinitions: jest.fn().mockReturnValue([]),
    } as unknown as ToolsService;

    await new LoopService(
      aiService,
      toolsService,
      execution,
      memoryService,
      memoryTools,
    ).run({ ...run, browserSessionId: undefined }, [
      { role: 'user', content: 'Say hello' },
    ]);

    expect(execution.recordEvent).toHaveBeenCalledWith(
      run.id,
      'assistant.delta',
      { content: 'Hello from Repin' },
    );
    expect(execution.publishLiveEvent).toHaveBeenLastCalledWith(
      run.id,
      'assistant.delta',
      { content: 'Hello from Repin' },
    );
  });

  it('records the context manifest on model steps for replay', async () => {
    const aiService = {
      generate: jest.fn().mockResolvedValue({
        provider: 'test',
        model: 'model',
        content: 'Done',
      }),
    } as unknown as AiService;
    const toolsService = {
      getDefinitions: jest.fn().mockReturnValue([]),
    } as unknown as ToolsService;
    const manifest = {
      strategy: 'retrieval' as const,
      includedItemIds: ['b2'],
      omittedItemCount: 3,
      truncated: true,
      estimatedTokens: 20,
      sourceObservationIds: ['observation-1'],
    };

    await new LoopService(
      aiService,
      toolsService,
      execution,
      memoryService,
      memoryTools,
    ).run(run, [{ role: 'user', content: 'Question' }], undefined, manifest);

    expect(execution.startStep).toHaveBeenCalledWith(
      run.id,
      'model',
      expect.objectContaining({ contextManifest: manifest }),
    );
  });

  it('tells the model to use live browser tools when a session is attached', async () => {
    const aiService = {
      generate: jest.fn().mockResolvedValue({
        provider: 'test',
        model: 'model',
        content: 'Current information',
      }),
    } as unknown as AiService;
    const toolsService = {
      getDefinitions: jest.fn().mockReturnValue([]),
    } as unknown as ToolsService;

    await new LoopService(
      aiService,
      toolsService,
      execution,
      memoryService,
      memoryTools,
    ).run(
      {
        ...run,
        context: {
          url: 'http://localhost:3000/conversations/new',
          title: 'Repin web conversation',
        },
      },
      [{ role: 'user', content: 'What is happening today?' }],
    );

    expect(aiService.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringMatching(
              /real-time web access[\s\S]+trending[\s\S]+browser_open_tab[\s\S]+application shell/,
            ),
          }),
        ]),
      }),
    );
  });

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
      supportsBrowser: jest.fn().mockReturnValue(true),
      requiresBrowserSession: jest.fn().mockReturnValue(true),
      execute: jest.fn().mockResolvedValue([
        {
          id: 'tab-1',
          windowId: 'window-1',
          active: true,
          pinned: false,
        },
      ]),
    } as unknown as ToolsService;
    const loop = new LoopService(
      aiService,
      toolsService,
      execution,
      memoryService,
      memoryTools,
    );

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

  it('recovers new-tab arguments emitted as plain JSON by compatible models', async () => {
    const aiService = {
      generate: jest
        .fn()
        .mockResolvedValueOnce({
          provider: 'test',
          model: 'model',
          content:
            '{"active":true,"url":"https://www.bing.com/search?q=trending+AI+conversations"}',
        })
        .mockResolvedValueOnce({
          provider: 'test',
          model: 'model',
          content: 'Here are the current discussions.',
        }),
    } as unknown as AiService;
    const toolsService = {
      getDefinitions: jest.fn().mockReturnValue([]),
      supports: jest.fn().mockReturnValue(true),
      requiresBrowserSession: jest.fn().mockReturnValue(true),
      execute: jest.fn().mockResolvedValue({ id: 'tab-2' }),
    } as unknown as ToolsService;

    const result = await new LoopService(
      aiService,
      toolsService,
      execution,
      memoryService,
      memoryTools,
    ).run(run, [{ role: 'user', content: 'Check trending AI conversations' }]);

    expect(result.content).toBe('Here are the current discussions.');
    expect(toolsService.execute).toHaveBeenCalledWith(
      {
        name: 'browser_open_tab',
        arguments: {
          active: true,
          url: 'https://www.bing.com/search?q=trending+AI+conversations',
        },
      },
      expect.objectContaining({ browserSessionId: 'browser-session-1' }),
    );
    expect(aiService.generate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ onTextDelta: undefined }),
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
      memoryService,
      memoryTools,
    ).run(run, []);

    expect(result.content).toBe('I cannot do that.');
    expect(aiService.generate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'tool',
            content: expect.stringContaining('Unsupported tool'),
          }),
        ]),
      }),
    );
  });

  it('adds only bounded global and current-domain memory to the model context', async () => {
    jest.spyOn(memoryService, 'getContext').mockResolvedValueOnce([
      {
        kind: 'user',
        content: 'Prefer concise answers',
        scope: 'global',
        sources: [{ type: 'explicit_user', trust: 'trusted' }],
      },
    ] as never);
    const aiService = {
      generate: jest.fn().mockResolvedValue({
        provider: 'test',
        model: 'model',
        content: 'Concise answer.',
      }),
    } as unknown as AiService;
    const toolsService = {
      getDefinitions: jest.fn().mockReturnValue([]),
    } as unknown as ToolsService;

    await new LoopService(
      aiService,
      toolsService,
      execution,
      memoryService,
      memoryTools,
    ).run(run, [
      { role: 'user', content: 'I am drafting an API guide' },
      { role: 'assistant', content: 'What should it cover?' },
      { role: 'user', content: 'Help me' },
    ]);

    expect(memoryService.getContext).toHaveBeenCalledWith(9, {
      query: 'I am drafting an API guide\nHelp me',
      scope: 'domain',
      scopeId: 'docs.example.com',
      limit: 10,
    });
    expect(aiService.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('Prefer concise answers'),
          }),
          { role: 'user', content: 'I am drafting an API guide' },
          { role: 'assistant', content: 'What should it cover?' },
          { role: 'user', content: 'Help me' },
        ]),
      }),
    );
  });
  it('records application tools without requiring a browser session', async () => {
    const runWithoutBrowser = { id: 'run-2', userId: 9 } as Run;
    const aiService = {
      generate: jest
        .fn()
        .mockResolvedValueOnce({
          provider: 'test',
          model: 'model',
          content: '',
          toolCalls: [
            {
              id: 'call-save',
              name: 'bookmark_page',
              arguments: {
                url: 'https://example.com/article',
                title: 'Example article',
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          provider: 'test',
          model: 'model',
          content: 'The page is saved.',
        }),
    } as unknown as AiService;
    const toolsService = {
      getDefinitions: jest.fn().mockReturnValue([]),
      supports: jest.fn().mockReturnValue(true),
      supportsBrowser: jest.fn().mockReturnValue(false),
      requiresBrowserSession: jest.fn().mockReturnValue(false),
      execute: jest.fn().mockResolvedValue({
        bookmarkId: 'bookmark-1',
        created: true,
        url: 'https://example.com/article',
        title: 'Example article',
      }),
    } as unknown as ToolsService;

    const result = await new LoopService(
      aiService,
      toolsService,
      execution,
      memoryService,
      memoryTools,
    ).run(runWithoutBrowser, []);

    expect(result.content).toBe('The page is saved.');
    expect(toolsService.execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'bookmark_page' }),
      expect.objectContaining({ userId: 9, runId: 'run-2' }),
    );
    expect(execution.completeStep).toHaveBeenCalledWith(
      'step-1',
      expect.objectContaining({
        success: true,
        result: expect.objectContaining({ bookmarkId: 'bookmark-1' }),
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
      supportsBrowser: jest.fn().mockReturnValue(true),
      requiresBrowserSession: jest.fn().mockReturnValue(true),
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as ToolsService;

    const result = await new LoopService(
      aiService,
      toolsService,
      execution,
      memoryService,
      memoryTools,
    ).run(run, []);

    expect(result.content).toBe('Resumed successfully.');
    expect(toolsService.execute).toHaveBeenCalledWith(
      { name: 'browser_list_tabs', arguments: {} },
      expect.objectContaining({
        idempotencyKey: '9d06cd75-e508-4d25-8a0d-a018863c2188',
      }),
    );
    expect(execution.startStep).toHaveBeenCalledWith(
      run.id,
      'model',
      expect.objectContaining({ iteration: 2 }),
    );
  });

  it('continues tool-driven work beyond the former call budget', async () => {
    const generate = jest.fn();
    for (let index = 0; index < 13; index += 1) {
      generate.mockResolvedValueOnce({
        provider: 'test',
        model: 'model',
        content: '',
        toolCalls: [
          {
            id: `call-${index}`,
            name: 'save_note',
            arguments: { index },
          },
        ],
      });
    }
    generate.mockResolvedValueOnce({
      provider: 'test',
      model: 'model',
      content: 'Long-running work completed.',
    });
    const aiService = { generate } as unknown as AiService;
    const toolsService = {
      getDefinitions: jest.fn().mockReturnValue([]),
      supports: jest.fn().mockReturnValue(true),
      supportsBrowser: jest.fn().mockReturnValue(false),
      requiresBrowserSession: jest.fn().mockReturnValue(false),
      execute: jest.fn().mockResolvedValue({ saved: true }),
    } as unknown as ToolsService;

    const result = await new LoopService(
      aiService,
      toolsService,
      execution,
      memoryService,
      memoryTools,
    ).run({ ...run, browserSessionId: undefined }, []);

    expect(result.content).toBe('Long-running work completed.');
    expect(generate).toHaveBeenCalledTimes(14);
    expect(toolsService.execute).toHaveBeenCalledTimes(13);
  });

  it('repairs an empty terminal result before completing', async () => {
    const aiService = {
      generate: jest
        .fn()
        .mockResolvedValueOnce({
          provider: 'test',
          model: 'model',
          content: '   ',
        })
        .mockResolvedValueOnce({
          provider: 'test',
          model: 'model',
          content: 'A valid final answer.',
        }),
    } as unknown as AiService;
    const toolsService = {
      getDefinitions: jest.fn().mockReturnValue([]),
    } as unknown as ToolsService;

    const result = await new LoopService(
      aiService,
      toolsService,
      execution,
      memoryService,
      memoryTools,
    ).run({ ...run, browserSessionId: undefined }, []);

    expect(result.content).toBe('A valid final answer.');
    expect(aiService.generate).toHaveBeenCalledTimes(2);
    expect(aiService.generate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('non-empty final answer'),
          }),
        ]),
      }),
    );
  });

  it('continues when the provider says the turn has not ended', async () => {
    const aiService = {
      generate: jest
        .fn()
        .mockResolvedValueOnce({
          provider: 'test',
          model: 'model',
          content: 'The first part was truncated.',
          endTurn: false,
          stopReason: 'length',
        })
        .mockResolvedValueOnce({
          provider: 'test',
          model: 'model',
          content: 'Here is the completed answer.',
          endTurn: true,
          stopReason: 'complete',
        }),
    } as unknown as AiService;
    const toolsService = {
      getDefinitions: jest.fn().mockReturnValue([]),
    } as unknown as ToolsService;

    const result = await new LoopService(
      aiService,
      toolsService,
      execution,
      memoryService,
      memoryTools,
    ).run({ ...run, browserSessionId: undefined }, []);

    expect(result.content).toBe('Here is the completed answer.');
    expect(aiService.generate).toHaveBeenCalledTimes(2);
    expect(aiService.generate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'assistant',
            content: 'The first part was truncated.',
          }),
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('did not end the turn'),
          }),
        ]),
      }),
    );
  });

  it('rejects a provider-filtered terminal result', async () => {
    const aiService = {
      generate: jest.fn().mockResolvedValue({
        provider: 'test',
        model: 'model',
        content: '',
        endTurn: true,
        stopReason: 'content_filter',
      }),
    } as unknown as AiService;
    const toolsService = {
      getDefinitions: jest.fn().mockReturnValue([]),
    } as unknown as ToolsService;

    await expect(
      new LoopService(
        aiService,
        toolsService,
        execution,
        memoryService,
        memoryTools,
      ).run({ ...run, browserSessionId: undefined }, []),
    ).rejects.toThrow('blocked by the provider content filter');
  });

  it('forces a final answer when successful tool calls do not terminate', async () => {
    const generate = jest
      .fn()
      .mockImplementation(async (options: AiGenerateOptions) =>
        options.tools?.length
          ? {
              provider: 'test',
              model: 'model',
              content: '',
              toolCalls: [
                {
                  id: `call-${generate.mock.calls.length}`,
                  name: 'save_note',
                  arguments: { index: generate.mock.calls.length },
                },
              ],
            }
          : {
              provider: 'test',
              model: 'model',
              content: 'Finished with the results collected so far.',
              toolCalls: [],
            },
      );
    const aiService = { generate } as unknown as AiService;
    const toolsService = {
      getDefinitions: jest.fn().mockReturnValue([
        {
          name: 'save_note',
          description: 'Save a note',
          inputSchema: { type: 'object' },
        },
      ]),
      supports: jest.fn().mockReturnValue(true),
      supportsBrowser: jest.fn().mockReturnValue(false),
      requiresBrowserSession: jest.fn().mockReturnValue(false),
      execute: jest.fn().mockResolvedValue({ saved: true }),
    } as unknown as ToolsService;
    const config = {
      get: jest.fn((key: string) =>
        key === 'assistantAgent'
          ? {
              noProgressThreshold: 3,
              budgets: {
                short: { maxToolCalls: 40 },
                long: { maxToolCalls: 120 },
                capabilities: { chat: { maxToolCalls: 24 } },
              },
            }
          : undefined,
      ),
    } as unknown as ConfigService<Configuration>;

    const result = await new LoopService(
      aiService,
      toolsService,
      execution,
      memoryService,
      memoryTools,
      config,
    ).run(
      {
        ...run,
        capability: 'chat',
        executionLane: 'short',
        browserSessionId: undefined,
        toolCallCount: 0,
      },
      [],
    );

    expect(result.content).toBe('Finished with the results collected so far.');
    expect(toolsService.execute).toHaveBeenCalledTimes(24);
    expect(generate).toHaveBeenCalledTimes(25);
    expect(generate).toHaveBeenLastCalledWith(
      expect.objectContaining({ tools: [] }),
    );
  });
});
