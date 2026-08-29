import { ServiceUnavailableException } from '@nestjs/common';
import { ExtensionBrowserExecutor } from './extension-browser.executor';
import type { ExtensionBrowserTransport } from './extension-browser-transport';
import type { BrowserToolExecutionContext } from '../types/browser-tool.types';

const context: BrowserToolExecutionContext = {
  userId: 4,
  runId: 'run-1',
  browserSessionId: 'browser-session-1',
};

describe('ExtensionBrowserExecutor', () => {
  it('sends correlated commands to the selected extension session', async () => {
    const transport: jest.Mocked<ExtensionBrowserTransport> = {
      send: jest.fn().mockResolvedValue({
        tab: {
          id: 'tab-1',
          windowId: 'window-1',
          active: true,
          pinned: false,
        },
      }),
    };
    const executor = new ExtensionBrowserExecutor(transport);

    await executor.navigate(context, {
      url: 'https://example.com/',
      tabId: 'tab-1',
    });

    expect(transport.send).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        commandId: expect.any(String),
        runId: 'run-1',
        name: 'browser_navigate',
        input: { url: 'https://example.com/', tabId: 'tab-1' },
      }),
    );
  });

  it('forwards grouped interaction commands without changing them', async () => {
    const transport: jest.Mocked<ExtensionBrowserTransport> = {
      send: jest.fn().mockResolvedValue({ success: true, tabId: 'tab-1' }),
    };
    const executor = new ExtensionBrowserExecutor(transport);
    const command = {
      name: 'browser_click' as const,
      input: {
        tabId: 'tab-1',
        ref: 'e1',
        documentRevision: 'document-1',
      },
    };

    await executor.interact(context, command);

    expect(transport.send).toHaveBeenCalledWith(
      context,
      expect.objectContaining({ name: command.name, input: command.input }),
    );
  });

  it('fails clearly before an extension transport is configured', async () => {
    const executor = new ExtensionBrowserExecutor();

    await expect(executor.listTabs(context)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
