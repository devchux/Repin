import {
  parseHttpUrl,
  readHttpUrl,
  readOptionalBoolean,
  readOptionalEnum,
  readOptionalInteger,
  readOptionalString,
  readRequiredString,
  readTabTarget,
} from '../../../shared/utils/validation';
import type {
  BrowserToolCall,
  BrowserToolExecutionContext,
  BrowserToolExecutor,
  BrowserToolResult,
} from '../types/browser-tool.types';
import { createInteractionCommand } from './interaction-command.factory';
import { createNavigationCommand } from './navigation-command.factory';

export const dispatchBrowserTool = (
  call: BrowserToolCall,
  context: BrowserToolExecutionContext,
  executor: BrowserToolExecutor,
): Promise<BrowserToolResult> => {
  const input = call.arguments;

  switch (call.name) {
    case 'browser_navigate':
      return executor.navigate(context, {
        url: readHttpUrl(input, 'url'),
        tabId: readOptionalString(input, 'tabId'),
      });
    case 'browser_go_back':
      return executor.goBack(context, {
        tabId: readOptionalString(input, 'tabId'),
      });
    case 'browser_go_forward':
      return executor.goForward(context, {
        tabId: readOptionalString(input, 'tabId'),
      });
    case 'browser_reload_page':
      return executor.reloadPage(context, {
        tabId: readOptionalString(input, 'tabId'),
        bypassCache: readOptionalBoolean(input, 'bypassCache'),
      });
    case 'browser_get_snapshot':
      return executor.getSnapshot(context, {
        tabId: readOptionalString(input, 'tabId'),
        includeText: readOptionalBoolean(input, 'includeText'),
        maxElements: readOptionalInteger(input, 'maxElements', 1, 1000),
      });
    case 'browser_get_screenshot':
      return executor.getScreenshot(context, {
        tabId: readOptionalString(input, 'tabId'),
        fullPage: readOptionalBoolean(input, 'fullPage'),
        format: readOptionalEnum(input, 'format', ['png', 'jpeg'] as const),
        quality: readOptionalInteger(input, 'quality', 1, 100),
      });
    case 'browser_get_page_metadata':
      return executor.getPageMetadata(context, readTabTarget(input));
    case 'browser_get_element':
      return executor.getElement(context, {
        ...readTabTarget(input),
        ref: readRequiredString(input, 'ref'),
        documentRevision: readRequiredString(input, 'documentRevision'),
      });
    case 'browser_get_selected_text':
      return executor.getSelectedText(context, readTabTarget(input));
    case 'browser_get_forms':
      return executor.getForms(context, {
        ...readTabTarget(input),
        maxForms: readOptionalInteger(input, 'maxForms', 1, 100),
      });
    case 'browser_get_navigation_state':
      return executor.getNavigationState(context, readTabTarget(input));
    case 'browser_get_frames':
      return executor.getFrames(context, readTabTarget(input));
    case 'browser_get_console_messages':
      return executor.getConsoleMessages(context, {
        ...readTabTarget(input),
        limit: readOptionalInteger(input, 'limit', 1, 500),
      });
    case 'browser_get_network_activity':
      return executor.getNetworkActivity(context, {
        ...readTabTarget(input),
        limit: readOptionalInteger(input, 'limit', 1, 500),
      });
    case 'browser_get_downloads':
      return executor.getDownloads(context, {
        limit: readOptionalInteger(input, 'limit', 1, 100),
      });
    case 'browser_get_dialog':
      return executor.getDialog(context, readTabTarget(input));
    case 'browser_get_storage_summary':
      return executor.getStorageSummary(context, readTabTarget(input));
    case 'browser_list_tabs':
      return executor.listTabs(context);
    case 'browser_open_tab': {
      const rawUrl = readOptionalString(input, 'url');
      return executor.openTab(context, {
        url: rawUrl ? parseHttpUrl(rawUrl, 'url') : undefined,
        active: readOptionalBoolean(input, 'active'),
      });
    }
    case 'browser_activate_tab':
      return executor.activateTab(context, {
        tabId: readRequiredString(input, 'tabId'),
      });
    case 'browser_close_tab':
      return executor.closeTab(context, {
        tabId: readRequiredString(input, 'tabId'),
      });
    case 'browser_stop_loading':
    case 'browser_get_history':
    case 'browser_go_to_history_entry':
    case 'browser_duplicate_tab':
    case 'browser_move_tab':
    case 'browser_pin_tab':
    case 'browser_reopen_closed_tab':
    case 'browser_list_windows':
    case 'browser_open_window':
    case 'browser_close_window':
      return executor.navigateBrowser(context, createNavigationCommand(call));
    default:
      return executor.interact(context, createInteractionCommand(call));
  }
};
