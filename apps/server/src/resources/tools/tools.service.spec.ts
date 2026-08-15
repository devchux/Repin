import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BROWSER_TOOL_DEFINITIONS } from './definitions';
import { ToolsService } from './tools.service';
import type {
  BrowserToolExecutionContext,
  BrowserToolExecutor,
} from './types/browser-tool.types';
import { BROWSER_TOOL_NAMES } from './types/browser-tool.types';

const context: BrowserToolExecutionContext = {
  userId: 7,
  runId: 'run-1',
  browserSessionId: 'session-1',
};

const createExecutor = (): jest.Mocked<BrowserToolExecutor> => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  reloadPage: jest.fn(),
  getSnapshot: jest.fn(),
  getScreenshot: jest.fn(),
  getPageMetadata: jest.fn(),
  getElement: jest.fn(),
  getSelectedText: jest.fn(),
  getForms: jest.fn(),
  getNavigationState: jest.fn(),
  getFrames: jest.fn(),
  getConsoleMessages: jest.fn(),
  getNetworkActivity: jest.fn(),
  getDownloads: jest.fn(),
  getDialog: jest.fn(),
  getStorageSummary: jest.fn(),
  listTabs: jest.fn(),
  openTab: jest.fn(),
  activateTab: jest.fn(),
  closeTab: jest.fn(),
  navigateBrowser: jest.fn(),
  interact: jest.fn(),
});

describe('ToolsService', () => {
  it('exposes the browser tools to AI providers', () => {
    const service = new ToolsService();

    expect(service.getDefinitions()).toEqual(BROWSER_TOOL_DEFINITIONS);
    expect(service.supports('browser_navigate')).toBe(true);
    expect(service.supports('unknown_tool')).toBe(false);
  });

  it('composes every tool exactly once across definition categories', () => {
    const names = BROWSER_TOOL_DEFINITIONS.map(({ name }) => name);

    expect(new Set(names).size).toBe(names.length);
    expect(new Set(names)).toEqual(new Set(BROWSER_TOOL_NAMES));
  });

  it('validates and dispatches browser navigation', async () => {
    const executor = createExecutor();
    executor.navigate.mockResolvedValue({
      tab: {
        id: 'tab-1',
        windowId: 'window-1',
        url: 'https://example.com/',
        active: true,
        pinned: false,
      },
    });
    const service = new ToolsService(executor);

    await service.execute(
      {
        name: 'browser_navigate',
        arguments: { url: 'https://example.com', tabId: ' tab-1 ' },
      },
      context,
    );

    expect(executor.navigate).toHaveBeenCalledWith(context, {
      url: 'https://example.com/',
      tabId: 'tab-1',
    });
  });

  it('rejects unsafe navigation protocols', async () => {
    const service = new ToolsService(createExecutor());

    await expect(
      service.execute(
        {
          name: 'browser_navigate',
          arguments: { url: 'javascript:alert(1)' },
        },
        context,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects element actions without a current document revision', async () => {
    const executor = createExecutor();
    const service = new ToolsService(executor);

    await expect(
      service.execute(
        { name: 'browser_click', arguments: { ref: 'e1' } },
        context,
      ),
    ).rejects.toThrow('requires a documentRevision');
    expect(executor.interact).not.toHaveBeenCalled();
  });

  it('validates and dispatches page snapshots', async () => {
    const executor = createExecutor();
    executor.getSnapshot.mockResolvedValue({
      tabId: 'tab-1',
      documentRevision: 'document-1',
      url: 'https://example.com/',
      title: 'Example',
      capturedAt: '2026-08-13T20:00:00.000Z',
      viewport: { width: 1280, height: 720, scrollX: 0, scrollY: 0 },
      elements: [{ ref: 'e1', role: 'link', name: 'More information' }],
      truncated: false,
    });
    const service = new ToolsService(executor);

    await service.execute(
      {
        name: 'browser_get_snapshot',
        arguments: {
          tabId: 'tab-1',
          includeText: true,
          maxElements: 250,
        },
      },
      context,
    );

    expect(executor.getSnapshot).toHaveBeenCalledWith(context, {
      tabId: 'tab-1',
      includeText: true,
      maxElements: 250,
    });
  });

  it('rejects page snapshot limits outside the supported range', async () => {
    const service = new ToolsService(createExecutor());

    await expect(
      service.execute(
        {
          name: 'browser_get_snapshot',
          arguments: { maxElements: 1001 },
        },
        context,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('dispatches screenshot observations with validated options', async () => {
    const executor = createExecutor();
    executor.getScreenshot.mockResolvedValue({
      tabId: 'tab-1',
      url: 'https://example.com/',
      capturedAt: '2026-08-14T00:00:00.000Z',
      mimeType: 'image/jpeg',
      dataBase64: 'c2NyZWVuc2hvdA==',
      width: 1280,
      height: 720,
      fullPage: true,
    });
    const service = new ToolsService(executor);

    await service.execute(
      {
        name: 'browser_get_screenshot',
        arguments: {
          tabId: ' tab-1 ',
          fullPage: true,
          format: 'jpeg',
          quality: 80,
        },
      },
      context,
    );

    expect(executor.getScreenshot).toHaveBeenCalledWith(context, {
      tabId: 'tab-1',
      fullPage: true,
      format: 'jpeg',
      quality: 80,
    });
  });

  it('requires document identity when inspecting snapshot elements', async () => {
    const service = new ToolsService(createExecutor());

    await expect(
      service.execute(
        {
          name: 'browser_get_element',
          arguments: { ref: 'e1' },
        },
        context,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exposes every supported observation definition', () => {
    const service = new ToolsService();
    const names = service.getDefinitions().map((definition) => definition.name);

    expect(names).toEqual(
      expect.arrayContaining([
        'browser_get_screenshot',
        'browser_get_page_metadata',
        'browser_get_element',
        'browser_get_selected_text',
        'browser_get_forms',
        'browser_get_navigation_state',
        'browser_get_frames',
        'browser_get_console_messages',
        'browser_get_network_activity',
        'browser_get_downloads',
        'browser_get_dialog',
        'browser_get_storage_summary',
      ]),
    );
  });

  it('exposes all interaction tools', () => {
    const names = new ToolsService().getDefinitions().map(({ name }) => name);
    expect(names).toEqual(
      expect.arrayContaining([
        'browser_click',
        'browser_double_click',
        'browser_hover',
        'browser_focus',
        'browser_type',
        'browser_fill',
        'browser_clear',
        'browser_press_key',
        'browser_select_option',
        'browser_check',
        'browser_uncheck',
        'browser_scroll',
        'browser_drag_and_drop',
        'browser_upload_files',
        'browser_submit_form',
        'browser_handle_dialog',
        'browser_set_permission',
        'browser_download',
        'browser_copy',
        'browser_paste',
        'browser_resize_viewport',
        'browser_switch_frame',
        'browser_wait',
        'browser_execute_script',
      ]),
    );
  });

  it('exposes the complete navigation tool family', () => {
    const names = new ToolsService().getDefinitions().map(({ name }) => name);
    expect(names).toEqual(
      expect.arrayContaining([
        'browser_navigate',
        'browser_go_back',
        'browser_go_forward',
        'browser_reload_page',
        'browser_stop_loading',
        'browser_get_history',
        'browser_go_to_history_entry',
        'browser_list_tabs',
        'browser_open_tab',
        'browser_activate_tab',
        'browser_close_tab',
        'browser_duplicate_tab',
        'browser_move_tab',
        'browser_pin_tab',
        'browser_reopen_closed_tab',
        'browser_list_windows',
        'browser_open_window',
        'browser_close_window',
      ]),
    );
  });

  it('exposes keyboard and mouse tools', () => {
    const names = new ToolsService().getDefinitions().map(({ name }) => name);
    expect(names).toEqual(
      expect.arrayContaining([
        'browser_press_key',
        'browser_key_down',
        'browser_key_up',
        'browser_insert_text',
        'browser_click',
        'browser_double_click',
        'browser_hover',
        'browser_mouse_move',
        'browser_mouse_down',
        'browser_mouse_up',
        'browser_mouse_wheel',
        'browser_scroll',
        'browser_drag_and_drop',
      ]),
    );
  });

  it('dispatches low-level keyboard input', async () => {
    const executor = createExecutor();
    executor.interact.mockResolvedValue({ success: true, tabId: 'tab-1' });
    const service = new ToolsService(executor);

    await service.execute(
      {
        name: 'browser_key_down',
        arguments: { tabId: 'tab-1', key: 'A', modifiers: ['Control'] },
      },
      context,
    );

    expect(executor.interact).toHaveBeenCalledWith(context, {
      name: 'browser_key_down',
      input: { tabId: 'tab-1', key: 'A', modifiers: ['Control'] },
    });
  });

  it('dispatches coordinate mouse input', async () => {
    const executor = createExecutor();
    executor.interact.mockResolvedValue({ success: true, tabId: 'tab-1' });
    const service = new ToolsService(executor);

    await service.execute(
      {
        name: 'browser_mouse_down',
        arguments: { x: 120.5, y: 80, button: 'left', clickCount: 1 },
      },
      context,
    );

    expect(executor.interact).toHaveBeenCalledWith(context, {
      name: 'browser_mouse_down',
      input: {
        tabId: undefined,
        x: 120.5,
        y: 80,
        button: 'left',
        clickCount: 1,
        modifiers: undefined,
      },
    });
  });

  it('rejects wheel input without a delta', async () => {
    const service = new ToolsService(createExecutor());
    await expect(
      service.execute(
        { name: 'browser_mouse_wheel', arguments: { x: 10, y: 20 } },
        context,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validates URLs before opening a browser window', async () => {
    const executor = createExecutor();
    executor.navigateBrowser.mockResolvedValue({
      id: 'window-1',
      focused: true,
      incognito: false,
      state: 'normal',
      tabs: [],
    });
    const service = new ToolsService(executor);

    await service.execute(
      {
        name: 'browser_open_window',
        arguments: { urls: ['https://example.com'], state: 'maximized' },
      },
      context,
    );

    expect(executor.navigateBrowser).toHaveBeenCalledWith(context, {
      name: 'browser_open_window',
      input: {
        urls: ['https://example.com/'],
        focused: undefined,
        incognito: undefined,
        state: 'maximized',
      },
    });
  });

  it('preserves false when unpinning a tab', async () => {
    const executor = createExecutor();
    executor.navigateBrowser.mockResolvedValue({
      id: 'tab-1',
      windowId: 'window-1',
      active: true,
      pinned: false,
    });
    const service = new ToolsService(executor);

    await service.execute(
      { name: 'browser_pin_tab', arguments: { tabId: 'tab-1', pinned: false } },
      context,
    );

    expect(executor.navigateBrowser).toHaveBeenCalledWith(context, {
      name: 'browser_pin_tab',
      input: { tabId: 'tab-1', pinned: false },
    });
  });

  it('dispatches stale-safe element interactions', async () => {
    const executor = createExecutor();
    executor.interact.mockResolvedValue({ success: true, tabId: 'tab-1' });
    const service = new ToolsService(executor);

    await service.execute(
      {
        name: 'browser_fill',
        arguments: {
          tabId: 'tab-1',
          ref: 'e2',
          documentRevision: 'doc-1',
          text: '',
        },
      },
      context,
    );

    expect(executor.interact).toHaveBeenCalledWith(context, {
      name: 'browser_fill',
      input: {
        tabId: 'tab-1',
        frameId: undefined,
        ref: 'e2',
        documentRevision: 'doc-1',
        text: '',
      },
    });
  });

  it('requires explicit approval for consequential interactions', async () => {
    const service = new ToolsService(createExecutor());
    await expect(
      service.execute(
        {
          name: 'browser_set_permission',
          arguments: { permission: 'camera', setting: 'allow' },
        },
        context,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects raw script source and only accepts registered script IDs', async () => {
    const service = new ToolsService(createExecutor());
    await expect(
      service.execute(
        {
          name: 'browser_execute_script',
          arguments: { script: 'document.cookie', approved: true },
        },
        context,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('fails clearly until a browser session executor is configured', async () => {
    const service = new ToolsService();

    await expect(
      service.execute({ name: 'browser_list_tabs', arguments: {} }, context),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
