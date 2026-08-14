import { BROWSER_TOOL_DEFINITIONS as CORE } from './internal/core.schemas';
import { selectDefinitions } from './definition-group';

export const BROWSER_OBSERVATION_TOOL_DEFINITIONS = selectDefinitions(CORE, [
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
]);
