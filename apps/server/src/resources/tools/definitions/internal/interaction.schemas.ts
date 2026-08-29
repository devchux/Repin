import type { AiTool } from '../../../ai/types/provider';
import type { BrowserToolName } from '../../types/browser-tool.types';

type Definition = AiTool & { readonly name: BrowserToolName };
const object = (
  properties: Record<string, unknown>,
  required: readonly string[] = [],
) => ({ type: 'object', properties, required, additionalProperties: false });
const tabId = { type: 'string', minLength: 1 };
const frameId = { type: 'string', minLength: 1 };
const ref = {
  type: 'string',
  minLength: 1,
  description: 'Element reference from the latest snapshot.',
};
const documentRevision = {
  type: 'string',
  minLength: 1,
  description: 'Document revision associated with the element reference.',
};
const target = { tabId, frameId, ref, documentRevision };
const targetRequired = ['ref', 'documentRevision'] as const;
const simple = (name: BrowserToolName, description: string): Definition => ({
  name,
  description,
  inputSchema: object(target, targetRequired),
});

export const BROWSER_INTERACTION_TOOL_DEFINITIONS = [
  simple('browser_click', 'Click a referenced element.'),
  simple('browser_double_click', 'Double-click a referenced element.'),
  simple('browser_hover', 'Hover over a referenced element.'),
  simple('browser_focus', 'Focus a referenced element.'),
  {
    name: 'browser_type',
    description: 'Type text into an editable element without clearing it.',
    inputSchema: object({ ...target, text: { type: 'string' } }, [
      ...targetRequired,
      'text',
    ]),
  },
  {
    name: 'browser_fill',
    description: 'Replace the value of an editable element.',
    inputSchema: object({ ...target, text: { type: 'string' } }, [
      ...targetRequired,
      'text',
    ]),
  },
  simple('browser_clear', 'Clear a referenced editable element.'),
  {
    name: 'browser_press_key',
    description:
      'Press a keyboard key or chord in a tab or referenced element.',
    inputSchema: object(
      {
        tabId,
        frameId,
        ref,
        documentRevision,
        key: { type: 'string', minLength: 1 },
      },
      ['key'],
    ),
  },
  {
    name: 'browser_select_option',
    description: 'Select native options by value, label, or zero-based index.',
    inputSchema: object(
      {
        ...target,
        values: { type: 'array', items: { type: 'string' }, minItems: 1 },
        labels: { type: 'array', items: { type: 'string' }, minItems: 1 },
        indexes: {
          type: 'array',
          items: { type: 'integer', minimum: 0 },
          minItems: 1,
        },
      },
      targetRequired,
    ),
  },
  simple('browser_check', 'Check a referenced checkbox or radio control.'),
  simple('browser_uncheck', 'Uncheck a referenced checkbox.'),
  {
    name: 'browser_scroll',
    description: 'Scroll a page or container, or bring an element into view.',
    inputSchema: object({
      tabId,
      frameId,
      ref,
      documentRevision,
      deltaX: { type: 'number' },
      deltaY: { type: 'number' },
      behavior: { type: 'string', enum: ['auto', 'smooth'] },
      block: { type: 'string', enum: ['start', 'center', 'end', 'nearest'] },
    }),
  },
  {
    name: 'browser_drag_and_drop',
    description: 'Drag one referenced element onto another.',
    inputSchema: object(
      { tabId, frameId, sourceRef: ref, targetRef: ref, documentRevision },
      ['sourceRef', 'targetRef', 'documentRevision'],
    ),
  },
  {
    name: 'browser_upload_files',
    description:
      'Attach user-approved file handles to a referenced file input. Filesystem paths are not accepted.',
    inputSchema: object(
      {
        ...target,
        fileIds: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          minItems: 1,
          maxItems: 20,
        },
      },
      [...targetRequired, 'fileIds'],
    ),
  },
  simple('browser_submit_form', 'Explicitly submit a referenced form.'),
  {
    name: 'browser_handle_dialog',
    description: 'Accept or dismiss the active browser dialog.',
    inputSchema: object(
      {
        tabId,
        action: { type: 'string', enum: ['accept', 'dismiss'] },
        promptText: { type: 'string' },
      },
      ['action'],
    ),
  },
  {
    name: 'browser_set_permission',
    description: 'Apply a user-approved site permission decision.',
    inputSchema: object(
      {
        tabId,
        permission: { type: 'string', minLength: 1 },
        setting: { type: 'string', enum: ['allow', 'deny', 'prompt'] },
        approved: { const: true },
      },
      ['permission', 'setting', 'approved'],
    ),
  },
  {
    name: 'browser_download',
    description:
      'Start a user-approved download from a referenced element or HTTP(S) URL.',
    inputSchema: object(
      {
        tabId,
        ref,
        documentRevision,
        url: { type: 'string', format: 'uri' },
        approved: { const: true },
      },
      ['approved'],
    ),
  },
  simple('browser_copy', 'Copy text from a referenced element or selection.'),
  {
    name: 'browser_paste',
    description:
      'Paste user-approved clipboard content into a referenced element.',
    inputSchema: object(
      { ...target, clipboardContentId: { type: 'string', minLength: 1 } },
      [...targetRequired, 'clipboardContentId'],
    ),
  },
  {
    name: 'browser_resize_viewport',
    description: 'Resize the browser viewport.',
    inputSchema: object(
      {
        tabId,
        width: { type: 'integer', minimum: 320, maximum: 7680 },
        height: { type: 'integer', minimum: 240, maximum: 4320 },
        deviceScaleFactor: { type: 'number', minimum: 0.5, maximum: 4 },
      },
      ['width', 'height'],
    ),
  },
  {
    name: 'browser_switch_frame',
    description:
      'Set the active frame for subsequent observations and interactions.',
    inputSchema: object({ tabId, frameId }, ['frameId']),
  },
  {
    name: 'browser_wait',
    description:
      'Wait for a bounded browser condition without arbitrary sleeping.',
    inputSchema: object(
      {
        tabId,
        condition: {
          type: 'string',
          enum: [
            'element_visible',
            'element_hidden',
            'text_present',
            'url_changed',
            'navigation_completed',
            'network_idle',
          ],
        },
        ref,
        documentRevision,
        text: { type: 'string' },
        url: { type: 'string' },
        timeoutMs: { type: 'integer', minimum: 100, maximum: 30000 },
      },
      ['condition'],
    ),
  },
  {
    name: 'browser_execute_script',
    description:
      'Execute a pre-registered, policy-approved script by identifier. Arbitrary source code is not accepted.',
    inputSchema: object(
      {
        tabId,
        scriptId: { type: 'string', minLength: 1 },
        arguments: { type: 'object' },
        approved: { const: true },
      },
      ['scriptId', 'approved'],
    ),
  },
  {
    name: 'browser_key_down',
    description: 'Hold a keyboard key down until a matching key-up command.',
    inputSchema: object(
      {
        tabId,
        key: { type: 'string', minLength: 1 },
        modifiers: {
          type: 'array',
          uniqueItems: true,
          items: { type: 'string', enum: ['Alt', 'Control', 'Meta', 'Shift'] },
        },
      },
      ['key'],
    ),
  },
  {
    name: 'browser_key_up',
    description: 'Release a keyboard key previously held down.',
    inputSchema: object(
      {
        tabId,
        key: { type: 'string', minLength: 1 },
        modifiers: {
          type: 'array',
          uniqueItems: true,
          items: { type: 'string', enum: ['Alt', 'Control', 'Meta', 'Shift'] },
        },
      },
      ['key'],
    ),
  },
  {
    name: 'browser_insert_text',
    description:
      'Insert literal text at the current keyboard focus without key events.',
    inputSchema: object({ tabId, text: { type: 'string' } }, ['text']),
  },
  {
    name: 'browser_mouse_move',
    description: 'Move the pointer to viewport coordinates.',
    inputSchema: object(
      {
        tabId,
        x: { type: 'number', minimum: 0 },
        y: { type: 'number', minimum: 0 },
        steps: { type: 'integer', minimum: 1, maximum: 100 },
      },
      ['x', 'y'],
    ),
  },
  {
    name: 'browser_mouse_down',
    description: 'Press and hold a mouse button at viewport coordinates.',
    inputSchema: object(
      {
        tabId,
        x: { type: 'number', minimum: 0 },
        y: { type: 'number', minimum: 0 },
        button: { type: 'string', enum: ['left', 'middle', 'right'] },
        clickCount: { type: 'integer', minimum: 1, maximum: 3 },
        modifiers: {
          type: 'array',
          uniqueItems: true,
          items: { type: 'string', enum: ['Alt', 'Control', 'Meta', 'Shift'] },
        },
      },
      ['x', 'y'],
    ),
  },
  {
    name: 'browser_mouse_up',
    description: 'Release a mouse button at viewport coordinates.',
    inputSchema: object(
      {
        tabId,
        x: { type: 'number', minimum: 0 },
        y: { type: 'number', minimum: 0 },
        button: { type: 'string', enum: ['left', 'middle', 'right'] },
        clickCount: { type: 'integer', minimum: 1, maximum: 3 },
        modifiers: {
          type: 'array',
          uniqueItems: true,
          items: { type: 'string', enum: ['Alt', 'Control', 'Meta', 'Shift'] },
        },
      },
      ['x', 'y'],
    ),
  },
  {
    name: 'browser_mouse_wheel',
    description:
      'Send a mouse-wheel gesture, optionally at viewport coordinates.',
    inputSchema: object({
      tabId,
      deltaX: { type: 'number' },
      deltaY: { type: 'number' },
      x: { type: 'number', minimum: 0 },
      y: { type: 'number', minimum: 0 },
    }),
  },
] as const satisfies readonly Definition[];
