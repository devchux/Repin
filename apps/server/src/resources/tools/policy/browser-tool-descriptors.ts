import type { BrowserToolName } from '../types/browser-tool.types';

export type BrowserToolRisk = 'low' | 'medium' | 'high';
export type BrowserToolSideEffect =
  | 'none'
  | 'reversible'
  | 'external'
  | 'destructive';

export interface BrowserToolDescriptor {
  readonly name: BrowserToolName;
  readonly risk: BrowserToolRisk;
  readonly sideEffect: BrowserToolSideEffect;
  readonly requiresApproval: boolean;
  readonly requiresDocumentRevision: boolean;
  readonly verifyAfterExecution: boolean;
}

const OBSERVATION_TOOLS = new Set<BrowserToolName>([
  'browser_get_snapshot',
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
  'browser_list_tabs',
  'browser_get_history',
  'browser_list_windows',
]);

const APPROVAL_TOOLS = new Set<BrowserToolName>([
  'browser_upload_files',
  'browser_submit_form',
  'browser_set_permission',
  'browser_download',
  'browser_paste',
  'browser_execute_script',
  'browser_close_tab',
  'browser_close_window',
]);

const REVISION_TOOLS = new Set<BrowserToolName>([
  'browser_get_element',
  'browser_click',
  'browser_double_click',
  'browser_hover',
  'browser_focus',
  'browser_type',
  'browser_fill',
  'browser_clear',
  'browser_select_option',
  'browser_check',
  'browser_uncheck',
  'browser_drag_and_drop',
  'browser_upload_files',
  'browser_submit_form',
  'browser_copy',
  'browser_paste',
]);

export function getBrowserToolDescriptor(
  name: BrowserToolName,
): BrowserToolDescriptor {
  const sideEffect: BrowserToolSideEffect = OBSERVATION_TOOLS.has(name)
    ? 'none'
    : name === 'browser_close_tab' || name === 'browser_close_window'
      ? 'destructive'
      : APPROVAL_TOOLS.has(name)
        ? 'external'
        : 'reversible';
  return {
    name,
    sideEffect,
    risk: APPROVAL_TOOLS.has(name)
      ? 'high'
      : sideEffect === 'none'
        ? 'low'
        : 'medium',
    requiresApproval: APPROVAL_TOOLS.has(name),
    requiresDocumentRevision: REVISION_TOOLS.has(name),
    verifyAfterExecution: sideEffect !== 'none',
  };
}
