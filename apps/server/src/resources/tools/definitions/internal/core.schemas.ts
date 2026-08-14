import type { AiTool } from '../../../ai/types/provider';
import type { BrowserToolName } from '../../types/browser-tool.types';
import { BROWSER_INTERACTION_TOOL_DEFINITIONS } from './interaction.schemas';

type BrowserToolDefinition = AiTool & { readonly name: BrowserToolName };

const objectSchema = (
  properties: Record<string, unknown>,
  required: readonly string[] = [],
): Record<string, unknown> => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});

const tabId = {
  type: 'string',
  minLength: 1,
  description: 'The browser tab identifier. Omit to use the active tab.',
};

export const BROWSER_TOOL_DEFINITIONS = [
  {
    name: 'browser_navigate',
    description:
      'Navigate the active tab, or a specified tab, to an absolute HTTP or HTTPS URL.',
    inputSchema: objectSchema(
      {
        url: { type: 'string', format: 'uri', description: 'Destination URL.' },
        tabId,
      },
      ['url'],
    ),
  },
  {
    name: 'browser_go_back',
    description: 'Navigate a browser tab backward by one history entry.',
    inputSchema: objectSchema({ tabId }),
  },
  {
    name: 'browser_go_forward',
    description: 'Navigate a browser tab forward by one history entry.',
    inputSchema: objectSchema({ tabId }),
  },
  {
    name: 'browser_reload_page',
    description: 'Reload the page in the active or specified browser tab.',
    inputSchema: objectSchema({
      tabId,
      bypassCache: {
        type: 'boolean',
        description: 'Whether to bypass the browser cache while reloading.',
      },
    }),
  },
  {
    name: 'browser_get_snapshot',
    description:
      'Capture the current page as a structured accessibility snapshot for inspection and subsequent browser actions.',
    inputSchema: objectSchema({
      tabId,
      includeText: {
        type: 'boolean',
        description:
          'Include readable page text in addition to interactive elements.',
      },
      maxElements: {
        type: 'integer',
        minimum: 1,
        maximum: 1000,
        description:
          'Maximum number of accessibility elements to return. Defaults to the executor limit.',
      },
    }),
  },
  {
    name: 'browser_get_screenshot',
    description:
      'Capture a PNG or JPEG image of the visible viewport or the full page.',
    inputSchema: objectSchema({
      tabId,
      fullPage: {
        type: 'boolean',
        description: 'Capture the full scrollable page.',
      },
      format: { type: 'string', enum: ['png', 'jpeg'] },
      quality: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        description: 'JPEG quality. Ignored for PNG captures.',
      },
    }),
  },
  {
    name: 'browser_get_page_metadata',
    description:
      'Read page metadata and lifecycle state including title, canonical URL, language, content type, and readiness.',
    inputSchema: objectSchema({ tabId }),
  },
  {
    name: 'browser_get_element',
    description:
      'Inspect one element from a page snapshot using its reference and document revision.',
    inputSchema: objectSchema(
      {
        tabId,
        ref: {
          type: 'string',
          minLength: 1,
          description: 'Element reference from a snapshot.',
        },
        documentRevision: {
          type: 'string',
          minLength: 1,
          description: 'Document revision returned with the snapshot.',
        },
      },
      ['ref', 'documentRevision'],
    ),
  },
  {
    name: 'browser_get_selected_text',
    description: 'Read the current text selection and its snapshot references.',
    inputSchema: objectSchema({ tabId }),
  },
  {
    name: 'browser_get_forms',
    description:
      'Inspect page forms, fields, and validation state. Sensitive field values are always redacted.',
    inputSchema: objectSchema({
      tabId,
      maxForms: { type: 'integer', minimum: 1, maximum: 100 },
    }),
  },
  {
    name: 'browser_get_navigation_state',
    description:
      'Read loading, document readiness, and back/forward availability for a tab.',
    inputSchema: objectSchema({ tabId }),
  },
  {
    name: 'browser_get_frames',
    description:
      'List the top-level document and nested frames available in a tab.',
    inputSchema: objectSchema({ tabId }),
  },
  {
    name: 'browser_get_console_messages',
    description: 'Read recent sanitized browser console messages for a tab.',
    inputSchema: objectSchema({
      tabId,
      limit: { type: 'integer', minimum: 1, maximum: 500 },
    }),
  },
  {
    name: 'browser_get_network_activity',
    description:
      'Read sanitized recent network request metadata without headers, cookies, or bodies.',
    inputSchema: objectSchema({
      tabId,
      limit: { type: 'integer', minimum: 1, maximum: 500 },
    }),
  },
  {
    name: 'browser_get_downloads',
    description: 'List downloads observed during the current browser session.',
    inputSchema: objectSchema({
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    }),
  },
  {
    name: 'browser_get_dialog',
    description:
      'Inspect an active browser dialog or permission prompt that may be blocking the tab.',
    inputSchema: objectSchema({ tabId }),
  },
  {
    name: 'browser_get_storage_summary',
    description:
      'Read storage key names and counts for the current origin without exposing stored values.',
    inputSchema: objectSchema({ tabId }),
  },
  {
    name: 'browser_list_tabs',
    description: 'List the tabs available in the current browser session.',
    inputSchema: objectSchema({}),
  },
  {
    name: 'browser_open_tab',
    description: 'Open a new browser tab, optionally at an HTTP or HTTPS URL.',
    inputSchema: objectSchema({
      url: { type: 'string', format: 'uri', description: 'Initial tab URL.' },
      active: {
        type: 'boolean',
        description: 'Whether the new tab should become active.',
      },
    }),
  },
  {
    name: 'browser_activate_tab',
    description: 'Make a browser tab active in its window.',
    inputSchema: objectSchema({ tabId }, ['tabId']),
  },
  {
    name: 'browser_close_tab',
    description: 'Close a specified browser tab.',
    inputSchema: objectSchema({ tabId }, ['tabId']),
  },
  {
    name: 'browser_stop_loading',
    description: 'Stop the active navigation or resource loading in a tab.',
    inputSchema: objectSchema({ tabId }),
  },
  {
    name: 'browser_get_history',
    description: 'List the session-history entries for a tab.',
    inputSchema: objectSchema({ tabId }),
  },
  {
    name: 'browser_go_to_history_entry',
    description:
      'Navigate a tab to a specific entry returned by browser_get_history.',
    inputSchema: objectSchema(
      { tabId, entryId: { type: 'string', minLength: 1 } },
      ['entryId'],
    ),
  },
  {
    name: 'browser_duplicate_tab',
    description: 'Duplicate an existing tab.',
    inputSchema: objectSchema({ tabId, active: { type: 'boolean' } }, [
      'tabId',
    ]),
  },
  {
    name: 'browser_move_tab',
    description: 'Move a tab to an index, optionally into another window.',
    inputSchema: objectSchema(
      {
        tabId,
        windowId: { type: 'string', minLength: 1 },
        index: { type: 'integer', minimum: 0 },
      },
      ['tabId', 'index'],
    ),
  },
  {
    name: 'browser_pin_tab',
    description: 'Pin or unpin a tab.',
    inputSchema: objectSchema({ tabId, pinned: { type: 'boolean' } }, [
      'tabId',
      'pinned',
    ]),
  },
  {
    name: 'browser_reopen_closed_tab',
    description:
      'Restore a recently closed tab, optionally by session identifier.',
    inputSchema: objectSchema({
      sessionId: { type: 'string', minLength: 1 },
    }),
  },
  {
    name: 'browser_list_windows',
    description: 'List browser windows and their tabs.',
    inputSchema: objectSchema({}),
  },
  {
    name: 'browser_open_window',
    description: 'Open a browser window with optional initial HTTP(S) URLs.',
    inputSchema: objectSchema({
      urls: {
        type: 'array',
        items: { type: 'string', format: 'uri' },
        minItems: 1,
        maxItems: 20,
      },
      focused: { type: 'boolean' },
      incognito: { type: 'boolean' },
      state: {
        type: 'string',
        enum: ['normal', 'minimized', 'maximized', 'fullscreen'],
      },
    }),
  },
  {
    name: 'browser_close_window',
    description: 'Close a browser window and its tabs.',
    inputSchema: objectSchema({ windowId: { type: 'string', minLength: 1 } }, [
      'windowId',
    ]),
  },
  ...BROWSER_INTERACTION_TOOL_DEFINITIONS,
] as const satisfies readonly BrowserToolDefinition[];
