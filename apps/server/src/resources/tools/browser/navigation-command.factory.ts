import { BadRequestException } from '@nestjs/common';
import {
  parseHttpUrl,
  readBoolean,
  readInteger,
  readOptionalBoolean,
  readOptionalEnum,
  readOptionalString,
  readOptionalStringArray,
  readRequiredString,
  readTabTarget,
} from '../../../shared/utils/validation';
import type {
  BrowserNavigationCommand,
  BrowserToolCall,
} from '../types/browser-tool.types';

export const createNavigationCommand = (
  call: BrowserToolCall,
): BrowserNavigationCommand => {
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
};
