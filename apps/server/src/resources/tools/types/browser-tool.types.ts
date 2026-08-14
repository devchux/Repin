export const BROWSER_TOOL_EXECUTOR = Symbol('BROWSER_TOOL_EXECUTOR');

export const BROWSER_TOOL_NAMES = [
  'browser_navigate',
  'browser_go_back',
  'browser_go_forward',
  'browser_reload_page',
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
  'browser_open_tab',
  'browser_activate_tab',
  'browser_close_tab',
  'browser_stop_loading',
  'browser_get_history',
  'browser_go_to_history_entry',
  'browser_duplicate_tab',
  'browser_move_tab',
  'browser_pin_tab',
  'browser_reopen_closed_tab',
  'browser_list_windows',
  'browser_open_window',
  'browser_close_window',
  'browser_click',
  'browser_double_click',
  'browser_hover',
  'browser_focus',
  'browser_type',
  'browser_fill',
  'browser_clear',
  'browser_press_key',
  'browser_select_option',
  'browser_check',
  'browser_uncheck',
  'browser_scroll',
  'browser_drag_and_drop',
  'browser_upload_files',
  'browser_submit_form',
  'browser_handle_dialog',
  'browser_set_permission',
  'browser_download',
  'browser_copy',
  'browser_paste',
  'browser_resize_viewport',
  'browser_switch_frame',
  'browser_wait',
  'browser_execute_script',
  'browser_key_down',
  'browser_key_up',
  'browser_insert_text',
  'browser_mouse_move',
  'browser_mouse_down',
  'browser_mouse_up',
  'browser_mouse_wheel',
] as const;

export type BrowserToolName = (typeof BROWSER_TOOL_NAMES)[number];

export interface BrowserToolExecutionContext {
  readonly userId: number;
  readonly runId: string;
  readonly browserSessionId: string;
  readonly signal?: AbortSignal;
}

export interface BrowserTab {
  readonly id: string;
  readonly windowId: string;
  readonly url?: string;
  readonly title?: string;
  readonly active: boolean;
  readonly pinned: boolean;
}

export interface BrowserPageState {
  readonly tab: BrowserTab;
}

export interface BrowserWindow {
  readonly id: string;
  readonly focused: boolean;
  readonly incognito: boolean;
  readonly state: 'normal' | 'minimized' | 'maximized' | 'fullscreen';
  readonly tabs: readonly BrowserTab[];
}

export interface BrowserHistoryEntry {
  readonly id: string;
  readonly index: number;
  readonly url: string;
  readonly title?: string;
  readonly current: boolean;
}

export interface BrowserHistoryObservation {
  readonly tabId: string;
  readonly entries: readonly BrowserHistoryEntry[];
}

export interface BrowserSnapshotElement {
  /** Stable only for the lifetime of this snapshot. */
  readonly ref: string;
  readonly role: string;
  readonly name?: string;
  readonly value?: string;
  readonly description?: string;
  readonly disabled?: boolean;
  readonly focused?: boolean;
  readonly checked?: boolean | 'mixed';
  readonly expanded?: boolean;
}

export interface BrowserPageSnapshot {
  readonly tabId: string;
  readonly documentRevision: string;
  readonly url: string;
  readonly title: string;
  readonly capturedAt: string;
  readonly viewport: {
    readonly width: number;
    readonly height: number;
    readonly scrollX: number;
    readonly scrollY: number;
  };
  readonly elements: readonly BrowserSnapshotElement[];
  readonly text?: string;
  readonly truncated: boolean;
}

export interface BrowserScreenshot {
  readonly tabId: string;
  readonly url: string;
  readonly capturedAt: string;
  readonly mimeType: 'image/png' | 'image/jpeg';
  readonly dataBase64: string;
  readonly width: number;
  readonly height: number;
  readonly fullPage: boolean;
}

export interface BrowserPageMetadata {
  readonly tabId: string;
  readonly documentRevision: string;
  readonly url: string;
  readonly title: string;
  readonly description?: string;
  readonly canonicalUrl?: string;
  readonly language?: string;
  readonly faviconUrl?: string;
  readonly contentType?: string;
  readonly readyState: 'loading' | 'interactive' | 'complete';
  readonly capturedAt: string;
}

export interface BrowserElementDetails extends BrowserSnapshotElement {
  readonly tabId: string;
  readonly documentRevision: string;
  readonly tagName?: string;
  readonly text?: string;
  readonly visible: boolean;
  readonly editable: boolean;
  readonly attributes: Readonly<Record<string, string>>;
  readonly bounds?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly actions: readonly string[];
}

export interface BrowserSelection {
  readonly tabId: string;
  readonly documentRevision: string;
  readonly text: string;
  readonly collapsed: boolean;
  readonly anchorRef?: string;
  readonly focusRef?: string;
}

export interface BrowserFormField {
  readonly ref: string;
  readonly name?: string;
  readonly label?: string;
  readonly type: string;
  readonly value?: string;
  readonly redacted: boolean;
  readonly required: boolean;
  readonly disabled: boolean;
  readonly valid: boolean;
  readonly validationMessage?: string;
}

export interface BrowserForm {
  readonly ref: string;
  readonly name?: string;
  readonly action?: string;
  readonly method?: string;
  readonly fields: readonly BrowserFormField[];
}

export interface BrowserFormsObservation {
  readonly tabId: string;
  readonly documentRevision: string;
  readonly forms: readonly BrowserForm[];
  readonly truncated: boolean;
}

export interface BrowserNavigationState {
  readonly tabId: string;
  readonly url: string;
  readonly loading: boolean;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
  readonly readyState: 'loading' | 'interactive' | 'complete';
}

export interface BrowserFrame {
  readonly id: string;
  readonly parentId?: string;
  readonly url: string;
  readonly origin: string;
  readonly name?: string;
  readonly accessible: boolean;
}

export interface BrowserFramesObservation {
  readonly tabId: string;
  readonly frames: readonly BrowserFrame[];
}

export interface BrowserConsoleMessage {
  readonly level: 'debug' | 'info' | 'warning' | 'error';
  readonly message: string;
  readonly source?: string;
  readonly line?: number;
  readonly column?: number;
  readonly timestamp: string;
}

export interface BrowserConsoleObservation {
  readonly tabId: string;
  readonly messages: readonly BrowserConsoleMessage[];
  readonly truncated: boolean;
}

export interface BrowserNetworkRequest {
  readonly id: string;
  readonly url: string;
  readonly method: string;
  readonly resourceType: string;
  readonly status?: number;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly pending: boolean;
  readonly failed: boolean;
  readonly error?: string;
}

export interface BrowserNetworkObservation {
  readonly tabId: string;
  readonly requests: readonly BrowserNetworkRequest[];
  readonly pendingCount: number;
  readonly truncated: boolean;
}

export interface BrowserDownload {
  readonly id: string;
  readonly filename: string;
  readonly sourceUrl?: string;
  readonly status: 'in_progress' | 'completed' | 'interrupted';
  readonly bytesReceived: number;
  readonly totalBytes?: number;
  readonly startedAt: string;
  readonly completedAt?: string;
}

export interface BrowserDownloadsObservation {
  readonly downloads: readonly BrowserDownload[];
  readonly truncated: boolean;
}

export interface BrowserDialogObservation {
  readonly tabId: string;
  readonly open: boolean;
  readonly type?:
    | 'alert'
    | 'confirm'
    | 'prompt'
    | 'beforeunload'
    | 'permission';
  readonly message?: string;
  readonly defaultValue?: string;
}

export interface BrowserStorageSummary {
  readonly tabId: string;
  readonly origin: string;
  readonly cookies: { readonly count: number };
  readonly localStorage: {
    readonly keyCount: number;
    readonly keys: readonly string[];
  };
  readonly sessionStorage: {
    readonly keyCount: number;
    readonly keys: readonly string[];
  };
  readonly indexedDb: {
    readonly databaseCount: number;
    readonly names: readonly string[];
  };
}

export interface BrowserToolExecutor {
  navigate(
    context: BrowserToolExecutionContext,
    input: { readonly url: string; readonly tabId?: string },
  ): Promise<BrowserPageState>;
  goBack(
    context: BrowserToolExecutionContext,
    input: { readonly tabId?: string },
  ): Promise<BrowserPageState>;
  goForward(
    context: BrowserToolExecutionContext,
    input: { readonly tabId?: string },
  ): Promise<BrowserPageState>;
  reloadPage(
    context: BrowserToolExecutionContext,
    input: { readonly tabId?: string; readonly bypassCache?: boolean },
  ): Promise<BrowserPageState>;
  getSnapshot(
    context: BrowserToolExecutionContext,
    input: {
      readonly tabId?: string;
      readonly includeText?: boolean;
      readonly maxElements?: number;
    },
  ): Promise<BrowserPageSnapshot>;
  getScreenshot(
    context: BrowserToolExecutionContext,
    input: {
      readonly tabId?: string;
      readonly fullPage?: boolean;
      readonly format?: 'png' | 'jpeg';
      readonly quality?: number;
    },
  ): Promise<BrowserScreenshot>;
  getPageMetadata(
    context: BrowserToolExecutionContext,
    input: TabTargetInput,
  ): Promise<BrowserPageMetadata>;
  getElement(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & {
      readonly ref: string;
      readonly documentRevision: string;
    },
  ): Promise<BrowserElementDetails>;
  getSelectedText(
    context: BrowserToolExecutionContext,
    input: TabTargetInput,
  ): Promise<BrowserSelection>;
  getForms(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & { readonly maxForms?: number },
  ): Promise<BrowserFormsObservation>;
  getNavigationState(
    context: BrowserToolExecutionContext,
    input: TabTargetInput,
  ): Promise<BrowserNavigationState>;
  getFrames(
    context: BrowserToolExecutionContext,
    input: TabTargetInput,
  ): Promise<BrowserFramesObservation>;
  getConsoleMessages(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & { readonly limit?: number },
  ): Promise<BrowserConsoleObservation>;
  getNetworkActivity(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & { readonly limit?: number },
  ): Promise<BrowserNetworkObservation>;
  getDownloads(
    context: BrowserToolExecutionContext,
    input: { readonly limit?: number },
  ): Promise<BrowserDownloadsObservation>;
  getDialog(
    context: BrowserToolExecutionContext,
    input: TabTargetInput,
  ): Promise<BrowserDialogObservation>;
  getStorageSummary(
    context: BrowserToolExecutionContext,
    input: TabTargetInput,
  ): Promise<BrowserStorageSummary>;
  listTabs(
    context: BrowserToolExecutionContext,
  ): Promise<readonly BrowserTab[]>;
  openTab(
    context: BrowserToolExecutionContext,
    input: { readonly url?: string; readonly active?: boolean },
  ): Promise<BrowserTab>;
  activateTab(
    context: BrowserToolExecutionContext,
    input: { readonly tabId: string },
  ): Promise<BrowserTab>;
  closeTab(
    context: BrowserToolExecutionContext,
    input: { readonly tabId: string },
  ): Promise<{ readonly tabId: string; readonly closed: true }>;
  navigateBrowser(
    context: BrowserToolExecutionContext,
    command: BrowserNavigationCommand,
  ): Promise<BrowserNavigationResult>;
  interact(
    context: BrowserToolExecutionContext,
    command: BrowserInteractionCommand,
  ): Promise<BrowserInteractionResult>;
}

export interface TabTargetInput {
  readonly tabId?: string;
}

export interface ElementTargetInput extends TabTargetInput {
  readonly frameId?: string;
  readonly ref: string;
  readonly documentRevision: string;
}

export type BrowserNavigationCommand =
  | { readonly name: 'browser_stop_loading'; readonly input: TabTargetInput }
  | { readonly name: 'browser_get_history'; readonly input: TabTargetInput }
  | {
      readonly name: 'browser_go_to_history_entry';
      readonly input: TabTargetInput & { readonly entryId: string };
    }
  | {
      readonly name: 'browser_duplicate_tab';
      readonly input: { readonly tabId: string; readonly active?: boolean };
    }
  | {
      readonly name: 'browser_move_tab';
      readonly input: {
        readonly tabId: string;
        readonly windowId?: string;
        readonly index: number;
      };
    }
  | {
      readonly name: 'browser_pin_tab';
      readonly input: { readonly tabId: string; readonly pinned: boolean };
    }
  | {
      readonly name: 'browser_reopen_closed_tab';
      readonly input: { readonly sessionId?: string };
    }
  | {
      readonly name: 'browser_list_windows';
      readonly input: Record<string, never>;
    }
  | {
      readonly name: 'browser_open_window';
      readonly input: {
        readonly urls?: readonly string[];
        readonly focused?: boolean;
        readonly incognito?: boolean;
        readonly state?: BrowserWindow['state'];
      };
    }
  | {
      readonly name: 'browser_close_window';
      readonly input: { readonly windowId: string };
    };

export type BrowserNavigationResult =
  | BrowserPageState
  | BrowserHistoryObservation
  | BrowserTab
  | BrowserWindow
  | readonly BrowserWindow[]
  | { readonly tabId: string; readonly stopped: true }
  | { readonly windowId: string; readonly closed: true };

export type BrowserInteractionCommand =
  | {
      readonly name:
        | 'browser_click'
        | 'browser_double_click'
        | 'browser_hover'
        | 'browser_focus'
        | 'browser_clear'
        | 'browser_check'
        | 'browser_uncheck'
        | 'browser_submit_form'
        | 'browser_copy';
      readonly input: ElementTargetInput;
    }
  | {
      readonly name: 'browser_type' | 'browser_fill';
      readonly input: ElementTargetInput & { readonly text: string };
    }
  | {
      readonly name: 'browser_press_key';
      readonly input: TabTargetInput & {
        readonly frameId?: string;
        readonly ref?: string;
        readonly documentRevision?: string;
        readonly key: string;
      };
    }
  | {
      readonly name: 'browser_select_option';
      readonly input: ElementTargetInput & {
        readonly values?: readonly string[];
        readonly labels?: readonly string[];
        readonly indexes?: readonly number[];
      };
    }
  | {
      readonly name: 'browser_scroll';
      readonly input: TabTargetInput & {
        readonly frameId?: string;
        readonly ref?: string;
        readonly documentRevision?: string;
        readonly deltaX?: number;
        readonly deltaY?: number;
        readonly behavior?: 'auto' | 'smooth';
        readonly block?: 'start' | 'center' | 'end' | 'nearest';
      };
    }
  | {
      readonly name: 'browser_drag_and_drop';
      readonly input: TabTargetInput & {
        readonly frameId?: string;
        readonly sourceRef: string;
        readonly targetRef: string;
        readonly documentRevision: string;
      };
    }
  | {
      readonly name: 'browser_upload_files';
      readonly input: ElementTargetInput & {
        readonly fileIds: readonly string[];
      };
    }
  | {
      readonly name: 'browser_handle_dialog';
      readonly input: TabTargetInput & {
        readonly action: 'accept' | 'dismiss';
        readonly promptText?: string;
      };
    }
  | {
      readonly name: 'browser_set_permission';
      readonly input: TabTargetInput & {
        readonly permission: string;
        readonly setting: 'allow' | 'deny' | 'prompt';
        readonly approved: true;
      };
    }
  | {
      readonly name: 'browser_download';
      readonly input: TabTargetInput & {
        readonly ref?: string;
        readonly documentRevision?: string;
        readonly url?: string;
        readonly approved: true;
      };
    }
  | {
      readonly name: 'browser_paste';
      readonly input: ElementTargetInput & {
        readonly clipboardContentId: string;
      };
    }
  | {
      readonly name: 'browser_resize_viewport';
      readonly input: TabTargetInput & {
        readonly width: number;
        readonly height: number;
        readonly deviceScaleFactor?: number;
      };
    }
  | {
      readonly name: 'browser_switch_frame';
      readonly input: TabTargetInput & { readonly frameId: string };
    }
  | {
      readonly name: 'browser_wait';
      readonly input: TabTargetInput & {
        readonly condition:
          | 'element_visible'
          | 'element_hidden'
          | 'text_present'
          | 'url_changed'
          | 'navigation_completed'
          | 'network_idle';
        readonly ref?: string;
        readonly documentRevision?: string;
        readonly text?: string;
        readonly url?: string;
        readonly timeoutMs?: number;
      };
    }
  | {
      readonly name: 'browser_execute_script';
      readonly input: TabTargetInput & {
        readonly scriptId: string;
        readonly arguments?: Readonly<Record<string, unknown>>;
        readonly approved: true;
      };
    }
  | {
      readonly name: 'browser_key_down' | 'browser_key_up';
      readonly input: TabTargetInput & {
        readonly key: string;
        readonly modifiers?: readonly BrowserKeyboardModifier[];
      };
    }
  | {
      readonly name: 'browser_insert_text';
      readonly input: TabTargetInput & { readonly text: string };
    }
  | {
      readonly name: 'browser_mouse_move';
      readonly input: BrowserPointerInput & { readonly steps?: number };
    }
  | {
      readonly name: 'browser_mouse_down' | 'browser_mouse_up';
      readonly input: BrowserPointerInput & {
        readonly button?: BrowserMouseButton;
        readonly clickCount?: number;
        readonly modifiers?: readonly BrowserKeyboardModifier[];
      };
    }
  | {
      readonly name: 'browser_mouse_wheel';
      readonly input: TabTargetInput & {
        readonly deltaX?: number;
        readonly deltaY?: number;
        readonly x?: number;
        readonly y?: number;
      };
    };

export type BrowserKeyboardModifier = 'Alt' | 'Control' | 'Meta' | 'Shift';
export type BrowserMouseButton = 'left' | 'middle' | 'right';

export interface BrowserPointerInput extends TabTargetInput {
  readonly x: number;
  readonly y: number;
}

export interface BrowserInteractionResult {
  readonly success: boolean;
  readonly tabId: string;
  readonly documentRevision?: string;
  readonly value?: unknown;
}

export interface BrowserToolCall {
  readonly name: BrowserToolName;
  readonly arguments: Record<string, unknown>;
}

export type BrowserToolResult =
  | BrowserPageState
  | BrowserPageSnapshot
  | BrowserScreenshot
  | BrowserPageMetadata
  | BrowserElementDetails
  | BrowserSelection
  | BrowserFormsObservation
  | BrowserNavigationState
  | BrowserFramesObservation
  | BrowserConsoleObservation
  | BrowserNetworkObservation
  | BrowserDownloadsObservation
  | BrowserDialogObservation
  | BrowserStorageSummary
  | BrowserTab
  | readonly BrowserTab[]
  | BrowserInteractionResult
  | BrowserNavigationResult
  | { readonly tabId: string; readonly closed: true };
