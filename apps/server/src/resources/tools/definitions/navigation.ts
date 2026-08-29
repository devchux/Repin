import { BROWSER_TOOL_DEFINITIONS as CORE } from './internal/core.schemas';
import { selectDefinitions } from './definition-group';

export const BROWSER_NAVIGATION_TOOL_DEFINITIONS = selectDefinitions(CORE, [
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
]);
