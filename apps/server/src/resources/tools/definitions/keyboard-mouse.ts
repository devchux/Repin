import { BROWSER_INTERACTION_TOOL_DEFINITIONS as INTERACTIONS } from './internal/interaction.schemas';
import { selectDefinitions } from './definition-group';

export const BROWSER_KEYBOARD_MOUSE_TOOL_DEFINITIONS = selectDefinitions(
  INTERACTIONS,
  [
    'browser_click',
    'browser_double_click',
    'browser_hover',
    'browser_focus',
    'browser_type',
    'browser_fill',
    'browser_clear',
    'browser_press_key',
    'browser_scroll',
    'browser_drag_and_drop',
    'browser_copy',
    'browser_paste',
    'browser_key_down',
    'browser_key_up',
    'browser_insert_text',
    'browser_mouse_move',
    'browser_mouse_down',
    'browser_mouse_up',
    'browser_mouse_wheel',
  ],
);
