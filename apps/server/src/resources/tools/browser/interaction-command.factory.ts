import { BadRequestException } from '@nestjs/common';
import {
  parseHttpUrl,
  readApproval,
  readEnum,
  readInteger,
  readNumber,
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
} from '../../../shared/utils/validation';
import type {
  BrowserInteractionCommand,
  BrowserToolCall,
  ElementTargetInput,
  TabTargetInput,
} from '../types/browser-tool.types';

const KEYBOARD_MODIFIERS = ['Alt', 'Control', 'Meta', 'Shift'] as const;
const MOUSE_BUTTONS = ['left', 'middle', 'right'] as const;

const readElementTarget = (
  input: Record<string, unknown>,
  tab: TabTargetInput,
  frameId?: string,
): ElementTargetInput => ({
  ...tab,
  frameId,
  ref: readRequiredString(input, 'ref'),
  documentRevision: readRequiredString(input, 'documentRevision'),
});

const readOptionalElementRevision = (
  input: Record<string, unknown>,
  ref?: string,
): string | undefined =>
  ref ? readRequiredString(input, 'documentRevision') : undefined;

export const createInteractionCommand = (
  call: BrowserToolCall,
): BrowserInteractionCommand => {
  const input = call.arguments;
  const tab = readTabTarget(input);
  const frameId = readOptionalString(input, 'frameId');
  const element = () => readElementTarget(input, tab, frameId);

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
          documentRevision: readOptionalElementRevision(input, ref),
          key: readRequiredString(input, 'key'),
        },
      };
    }
    case 'browser_select_option': {
      const values = readOptionalStringArray(input, 'values');
      const labels = readOptionalStringArray(input, 'labels');
      const indexes = readOptionalIntegerArray(input, 'indexes', 0, 10000);
      if (!values && !labels && !indexes) {
        throw new BadRequestException('values, labels, or indexes is required');
      }
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
          documentRevision: readOptionalElementRevision(input, ref),
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
        input: { ...element(), fileIds: readStringArray(input, 'fileIds', 20) },
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
      if (!ref && !rawUrl) {
        throw new BadRequestException('ref or url is required');
      }
      return {
        name: call.name,
        input: {
          ...tab,
          ref,
          documentRevision: readOptionalElementRevision(input, ref),
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
      ) {
        throw new BadRequestException(
          'ref is required for element wait conditions',
        );
      }
      if (condition === 'text_present' && !text) {
        throw new BadRequestException('text is required for text_present');
      }
      return {
        name: call.name,
        input: {
          ...tab,
          condition,
          ref,
          documentRevision: readOptionalElementRevision(input, ref),
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
          modifiers: readOptionalEnumArray(
            input,
            'modifiers',
            KEYBOARD_MODIFIERS,
          ),
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
          button: readOptionalEnum(input, 'button', MOUSE_BUTTONS),
          clickCount: readOptionalInteger(input, 'clickCount', 1, 3),
          modifiers: readOptionalEnumArray(
            input,
            'modifiers',
            KEYBOARD_MODIFIERS,
          ),
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
      throw new BadRequestException(`${call.name} is not an interaction tool`);
  }
};
