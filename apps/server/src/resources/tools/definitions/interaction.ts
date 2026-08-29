import { BROWSER_INTERACTION_TOOL_DEFINITIONS as INTERACTIONS } from './internal/interaction.schemas';
import { selectDefinitions } from './definition-group';

export const BROWSER_INTERACTION_TOOL_DEFINITIONS = selectDefinitions(
  INTERACTIONS,
  [
    'browser_select_option',
    'browser_check',
    'browser_uncheck',
    'browser_upload_files',
    'browser_submit_form',
    'browser_handle_dialog',
    'browser_set_permission',
    'browser_download',
    'browser_resize_viewport',
    'browser_switch_frame',
    'browser_wait',
    'browser_execute_script',
  ],
);
