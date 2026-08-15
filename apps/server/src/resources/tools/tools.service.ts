import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AiTool } from '../ai/types/provider';
import { BROWSER_TOOL_DEFINITIONS } from './definitions';
import {
  parseHttpUrl,
  readApproval,
  readBoolean,
  readEnum,
  readHttpUrl,
  readInteger,
  readNumber,
  readOptionalBoolean,
  readOptionalEnum,
  readOptionalEnumArray,
  readOptionalInteger,
  readOptionalIntegerArray,
  readOptionalNumber,
  readOptionalRecord,
  readOptionalString,
  readOptionalStringAllowEmpty,
  readOptionalStringArray,
  readRequiredString,
  readString,
  readStringArray,
  readTabTarget,
} from '../../shared/utils/validation';
import { BrowserToolApprovalService } from './policy/browser-tool-approval.service';
import {
  BROWSER_TOOL_EXECUTOR,
  BROWSER_TOOL_NAMES,
} from './types/browser-tool.types';
import type {
  BrowserToolCall,
  BrowserToolExecutionContext,
  BrowserToolExecutor,
  BrowserInteractionCommand,
  BrowserNavigationCommand,
  BrowserToolName,
  BrowserToolResult,
} from './types/browser-tool.types';

@Injectable()
export class ToolsService {
  constructor(
    @Optional()
    @Inject(BROWSER_TOOL_EXECUTOR)
    private readonly browserExecutor?: BrowserToolExecutor,
    private readonly approvals?: BrowserToolApprovalService,
  ) {}

  getDefinitions(): readonly AiTool[] {
    return BROWSER_TOOL_DEFINITIONS;
  }

  supports(name: string): name is BrowserToolName {
    return (BROWSER_TOOL_NAMES as readonly string[]).includes(name);
  }

  async execute(
    call: BrowserToolCall,
    context: BrowserToolExecutionContext,
  ): Promise<BrowserToolResult> {
    const executor = this.getExecutor();
    this.assertContext(context);
    this.approvals?.authorize(context.userId, context.runId, call.name);

    switch (call.name) {
      case 'browser_navigate':
        return executor.navigate(context, {
          url: readHttpUrl(call.arguments, 'url'),
          tabId: readOptionalString(call.arguments, 'tabId'),
        });
      case 'browser_go_back':
        return executor.goBack(context, {
          tabId: readOptionalString(call.arguments, 'tabId'),
        });
      case 'browser_go_forward':
        return executor.goForward(context, {
          tabId: readOptionalString(call.arguments, 'tabId'),
        });
      case 'browser_reload_page':
        return executor.reloadPage(context, {
          tabId: readOptionalString(call.arguments, 'tabId'),
          bypassCache: readOptionalBoolean(call.arguments, 'bypassCache'),
        });
      case 'browser_get_snapshot':
        return executor.getSnapshot(context, {
          tabId: readOptionalString(call.arguments, 'tabId'),
          includeText: readOptionalBoolean(call.arguments, 'includeText'),
          maxElements: readOptionalInteger(
            call.arguments,
            'maxElements',
            1,
            1000,
          ),
        });
      case 'browser_get_screenshot':
        return executor.getScreenshot(context, {
          tabId: readOptionalString(call.arguments, 'tabId'),
          fullPage: readOptionalBoolean(call.arguments, 'fullPage'),
          format: readOptionalEnum(call.arguments, 'format', [
            'png',
            'jpeg',
          ] as const),
          quality: readOptionalInteger(call.arguments, 'quality', 1, 100),
        });
      case 'browser_get_page_metadata':
        return executor.getPageMetadata(context, readTabTarget(call.arguments));
      case 'browser_get_element':
        return executor.getElement(context, {
          ...readTabTarget(call.arguments),
          ref: readRequiredString(call.arguments, 'ref'),
          documentRevision: readRequiredString(
            call.arguments,
            'documentRevision',
          ),
        });
      case 'browser_get_selected_text':
        return executor.getSelectedText(context, readTabTarget(call.arguments));
      case 'browser_get_forms':
        return executor.getForms(context, {
          ...readTabTarget(call.arguments),
          maxForms: readOptionalInteger(call.arguments, 'maxForms', 1, 100),
        });
      case 'browser_get_navigation_state':
        return executor.getNavigationState(
          context,
          readTabTarget(call.arguments),
        );
      case 'browser_get_frames':
        return executor.getFrames(context, readTabTarget(call.arguments));
      case 'browser_get_console_messages':
        return executor.getConsoleMessages(context, {
          ...readTabTarget(call.arguments),
          limit: readOptionalInteger(call.arguments, 'limit', 1, 500),
        });
      case 'browser_get_network_activity':
        return executor.getNetworkActivity(context, {
          ...readTabTarget(call.arguments),
          limit: readOptionalInteger(call.arguments, 'limit', 1, 500),
        });
      case 'browser_get_downloads':
        return executor.getDownloads(context, {
          limit: readOptionalInteger(call.arguments, 'limit', 1, 100),
        });
      case 'browser_get_dialog':
        return executor.getDialog(context, readTabTarget(call.arguments));
      case 'browser_get_storage_summary':
        return executor.getStorageSummary(
          context,
          readTabTarget(call.arguments),
        );
      case 'browser_list_tabs':
        return executor.listTabs(context);
      case 'browser_open_tab': {
        const rawUrl = readOptionalString(call.arguments, 'url');
        return executor.openTab(context, {
          url: rawUrl ? parseHttpUrl(rawUrl, 'url') : undefined,
          active: readOptionalBoolean(call.arguments, 'active'),
        });
      }
      case 'browser_activate_tab':
        return executor.activateTab(context, {
          tabId: readRequiredString(call.arguments, 'tabId'),
        });
      case 'browser_close_tab':
        return executor.closeTab(context, {
          tabId: readRequiredString(call.arguments, 'tabId'),
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
        return executor.navigateBrowser(
          context,
          this.createNavigationCommand(call),
        );
      case 'browser_click':
      case 'browser_double_click':
      case 'browser_hover':
      case 'browser_focus':
      case 'browser_type':
      case 'browser_fill':
      case 'browser_clear':
      case 'browser_press_key':
      case 'browser_select_option':
      case 'browser_check':
      case 'browser_uncheck':
      case 'browser_scroll':
      case 'browser_drag_and_drop':
      case 'browser_upload_files':
      case 'browser_submit_form':
      case 'browser_handle_dialog':
      case 'browser_set_permission':
      case 'browser_download':
      case 'browser_copy':
      case 'browser_paste':
      case 'browser_resize_viewport':
      case 'browser_switch_frame':
      case 'browser_wait':
      case 'browser_execute_script':
      case 'browser_key_down':
      case 'browser_key_up':
      case 'browser_insert_text':
      case 'browser_mouse_move':
      case 'browser_mouse_down':
      case 'browser_mouse_up':
      case 'browser_mouse_wheel':
        return executor.interact(context, this.createInteractionCommand(call));
    }
  }

  private createNavigationCommand(
    call: BrowserToolCall,
  ): BrowserNavigationCommand {
    const input = call.arguments;
    switch (call.name) {
      case 'browser_stop_loading':
      case 'browser_get_history':
        return { name: call.name, input: readTabTarget(input) };
      case 'browser_go_to_history_entry':
        return {
          name: call.name,
          input: {
            ...readTabTarget(input),
            entryId: readRequiredString(input, 'entryId'),
          },
        };
      case 'browser_duplicate_tab':
        return {
          name: call.name,
          input: {
            tabId: readRequiredString(input, 'tabId'),
            active: readOptionalBoolean(input, 'active'),
          },
        };
      case 'browser_move_tab':
        return {
          name: call.name,
          input: {
            tabId: readRequiredString(input, 'tabId'),
            windowId: readOptionalString(input, 'windowId'),
            index: readInteger(input, 'index', 0, 100000),
          },
        };
      case 'browser_pin_tab':
        return {
          name: call.name,
          input: {
            tabId: readRequiredString(input, 'tabId'),
            pinned: readBoolean(input, 'pinned'),
          },
        };
      case 'browser_reopen_closed_tab':
        return {
          name: call.name,
          input: { sessionId: readOptionalString(input, 'sessionId') },
        };
      case 'browser_list_windows':
        return { name: call.name, input: {} };
      case 'browser_open_window': {
        const rawUrls = readOptionalStringArray(input, 'urls', 20);
        return {
          name: call.name,
          input: {
            urls: rawUrls?.map((url) => parseHttpUrl(url, 'urls')),
            focused: readOptionalBoolean(input, 'focused'),
            incognito: readOptionalBoolean(input, 'incognito'),
            state: readOptionalEnum(input, 'state', [
              'normal',
              'minimized',
              'maximized',
              'fullscreen',
            ] as const),
          },
        };
      }
      case 'browser_close_window':
        return {
          name: call.name,
          input: { windowId: readRequiredString(input, 'windowId') },
        };
      default:
        throw new BadRequestException(`${call.name} is not a navigation tool`);
    }
  }

  private createInteractionCommand(
    call: BrowserToolCall,
  ): BrowserInteractionCommand {
    const input = call.arguments;
    const tab = readTabTarget(input);
    const frameId = readOptionalString(input, 'frameId');
    const element = () => ({
      ...tab,
      frameId,
      ref: readRequiredString(input, 'ref'),
      documentRevision: readRequiredString(input, 'documentRevision'),
    });
    switch (call.name) {
      case 'browser_click':
      case 'browser_double_click':
      case 'browser_hover':
      case 'browser_focus':
      case 'browser_clear':
      case 'browser_check':
      case 'browser_uncheck':
      case 'browser_submit_form':
      case 'browser_copy':
        return { name: call.name, input: element() };
      case 'browser_type':
      case 'browser_fill':
        return {
          name: call.name,
          input: { ...element(), text: readString(input, 'text') },
        };
      case 'browser_press_key': {
        const ref = readOptionalString(input, 'ref');
        return {
          name: call.name,
          input: {
            ...tab,
            frameId,
            ref,
            documentRevision: ref
              ? readRequiredString(input, 'documentRevision')
              : undefined,
            key: readRequiredString(input, 'key'),
          },
        };
      }
      case 'browser_select_option': {
        const values = readOptionalStringArray(input, 'values');
        const labels = readOptionalStringArray(input, 'labels');
        const indexes = readOptionalIntegerArray(input, 'indexes', 0, 10000);
        if (!values && !labels && !indexes)
          throw new BadRequestException(
            'values, labels, or indexes is required',
          );
        return {
          name: call.name,
          input: { ...element(), values, labels, indexes },
        };
      }
      case 'browser_scroll': {
        const ref = readOptionalString(input, 'ref');
        return {
          name: call.name,
          input: {
            ...tab,
            frameId,
            ref,
            documentRevision: ref
              ? readRequiredString(input, 'documentRevision')
              : undefined,
            deltaX: readOptionalNumber(input, 'deltaX'),
            deltaY: readOptionalNumber(input, 'deltaY'),
            behavior: readOptionalEnum(input, 'behavior', [
              'auto',
              'smooth',
            ] as const),
            block: readOptionalEnum(input, 'block', [
              'start',
              'center',
              'end',
              'nearest',
            ] as const),
          },
        };
      }
      case 'browser_drag_and_drop':
        return {
          name: call.name,
          input: {
            ...tab,
            frameId,
            sourceRef: readRequiredString(input, 'sourceRef'),
            targetRef: readRequiredString(input, 'targetRef'),
            documentRevision: readRequiredString(input, 'documentRevision'),
          },
        };
      case 'browser_upload_files':
        return {
          name: call.name,
          input: {
            ...element(),
            fileIds: readStringArray(input, 'fileIds', 20),
          },
        };
      case 'browser_handle_dialog':
        return {
          name: call.name,
          input: {
            ...tab,
            action: readEnum(input, 'action', ['accept', 'dismiss'] as const),
            promptText: readOptionalStringAllowEmpty(input, 'promptText'),
          },
        };
      case 'browser_set_permission':
        return {
          name: call.name,
          input: {
            ...tab,
            permission: readRequiredString(input, 'permission'),
            setting: readEnum(input, 'setting', [
              'allow',
              'deny',
              'prompt',
            ] as const),
            approved: readApproval(input),
          },
        };
      case 'browser_download': {
        const ref = readOptionalString(input, 'ref');
        const rawUrl = readOptionalString(input, 'url');
        if (!ref && !rawUrl)
          throw new BadRequestException('ref or url is required');
        return {
          name: call.name,
          input: {
            ...tab,
            ref,
            documentRevision: ref
              ? readRequiredString(input, 'documentRevision')
              : undefined,
            url: rawUrl ? parseHttpUrl(rawUrl, 'url') : undefined,
            approved: readApproval(input),
          },
        };
      }
      case 'browser_paste':
        return {
          name: call.name,
          input: {
            ...element(),
            clipboardContentId: readRequiredString(input, 'clipboardContentId'),
          },
        };
      case 'browser_resize_viewport':
        return {
          name: call.name,
          input: {
            ...tab,
            width: readInteger(input, 'width', 320, 7680),
            height: readInteger(input, 'height', 240, 4320),
            deviceScaleFactor: readOptionalNumber(
              input,
              'deviceScaleFactor',
              0.5,
              4,
            ),
          },
        };
      case 'browser_switch_frame':
        return {
          name: call.name,
          input: { ...tab, frameId: readRequiredString(input, 'frameId') },
        };
      case 'browser_wait': {
        const condition = readEnum(input, 'condition', [
          'element_visible',
          'element_hidden',
          'text_present',
          'url_changed',
          'navigation_completed',
          'network_idle',
        ] as const);
        const ref = readOptionalString(input, 'ref');
        const text = readOptionalString(input, 'text');
        const url = readOptionalString(input, 'url');
        if (
          (condition === 'element_visible' || condition === 'element_hidden') &&
          !ref
        )
          throw new BadRequestException(
            'ref is required for element wait conditions',
          );
        if (condition === 'text_present' && !text)
          throw new BadRequestException('text is required for text_present');
        return {
          name: call.name,
          input: {
            ...tab,
            condition,
            ref,
            documentRevision: ref
              ? readRequiredString(input, 'documentRevision')
              : undefined,
            text,
            url,
            timeoutMs: readOptionalInteger(input, 'timeoutMs', 100, 30000),
          },
        };
      }
      case 'browser_execute_script':
        return {
          name: call.name,
          input: {
            ...tab,
            scriptId: readRequiredString(input, 'scriptId'),
            arguments: readOptionalRecord(input, 'arguments'),
            approved: readApproval(input),
          },
        };
      case 'browser_key_down':
      case 'browser_key_up':
        return {
          name: call.name,
          input: {
            ...tab,
            key: readRequiredString(input, 'key'),
            modifiers: readOptionalEnumArray(input, 'modifiers', [
              'Alt',
              'Control',
              'Meta',
              'Shift',
            ] as const),
          },
        };
      case 'browser_insert_text':
        return {
          name: call.name,
          input: { ...tab, text: readString(input, 'text') },
        };
      case 'browser_mouse_move':
        return {
          name: call.name,
          input: {
            ...tab,
            x: readNumber(input, 'x', 0),
            y: readNumber(input, 'y', 0),
            steps: readOptionalInteger(input, 'steps', 1, 100),
          },
        };
      case 'browser_mouse_down':
      case 'browser_mouse_up':
        return {
          name: call.name,
          input: {
            ...tab,
            x: readNumber(input, 'x', 0),
            y: readNumber(input, 'y', 0),
            button: readOptionalEnum(input, 'button', [
              'left',
              'middle',
              'right',
            ] as const),
            clickCount: readOptionalInteger(input, 'clickCount', 1, 3),
            modifiers: readOptionalEnumArray(input, 'modifiers', [
              'Alt',
              'Control',
              'Meta',
              'Shift',
            ] as const),
          },
        };
      case 'browser_mouse_wheel': {
        const deltaX = readOptionalNumber(input, 'deltaX');
        const deltaY = readOptionalNumber(input, 'deltaY');
        if (deltaX === undefined && deltaY === undefined) {
          throw new BadRequestException('deltaX or deltaY is required');
        }
        return {
          name: call.name,
          input: {
            ...tab,
            deltaX,
            deltaY,
            x: readOptionalNumber(input, 'x', 0),
            y: readOptionalNumber(input, 'y', 0),
          },
        };
      }
      default:
        throw new BadRequestException(
          `${call.name} is not an interaction tool`,
        );
    }
  }

  private getExecutor(): BrowserToolExecutor {
    if (!this.browserExecutor) {
      throw new ServiceUnavailableException(
        'No browser session executor is configured',
      );
    }
    return this.browserExecutor;
  }

  private assertContext(context: BrowserToolExecutionContext): void {
    if (!Number.isInteger(context.userId) || context.userId <= 0) {
      throw new BadRequestException('A valid tool user ID is required');
    }
    if (!context.runId?.trim()) {
      throw new BadRequestException('A tool run ID is required');
    }
    if (!context.browserSessionId?.trim()) {
      throw new BadRequestException('A browser session ID is required');
    }
    if (context.signal?.aborted) {
      throw context.signal.reason instanceof Error
        ? context.signal.reason
        : new Error('Tool execution was aborted');
    }
  }
}
