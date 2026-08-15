import { BrowserExecutorRouter } from './browser-executor.router';
import type { ExtensionBrowserExecutor } from './extension-browser.executor';
import type { PlaywrightBrowserExecutor } from './playwright-browser.executor';

describe('BrowserExecutorRouter', () => {
  it('routes extension sessions to the extension executor', async () => {
    const extension = { listTabs: jest.fn().mockResolvedValue([]) };
    const playwright = { listTabs: jest.fn() };
    const router = new BrowserExecutorRouter(
      extension as unknown as ExtensionBrowserExecutor,
      playwright as unknown as PlaywrightBrowserExecutor,
    );

    await router.listTabs({
      userId: 1,
      runId: 'run-1',
      browserSessionId: 'session-1',
      executorKind: 'extension',
    });

    expect(extension.listTabs).toHaveBeenCalled();
    expect(playwright.listTabs).not.toHaveBeenCalled();
  });

  it('routes managed sessions to Playwright', async () => {
    const extension = { listTabs: jest.fn() };
    const playwright = { listTabs: jest.fn().mockResolvedValue([]) };
    const router = new BrowserExecutorRouter(
      extension as unknown as ExtensionBrowserExecutor,
      playwright as unknown as PlaywrightBrowserExecutor,
    );

    await router.listTabs({
      userId: 1,
      runId: 'run-1',
      browserSessionId: 'session-1',
      executorKind: 'managed',
    });

    expect(playwright.listTabs).toHaveBeenCalled();
    expect(extension.listTabs).not.toHaveBeenCalled();
  });
});
