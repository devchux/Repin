export const PAGE_CONTENT_BLOCK_KINDS = [
  "heading",
  "paragraph",
  "list",
  "table",
  "code",
  "quote",
  "form",
  "navigation",
  "other",
] as const;

export type PageContentBlockKind = (typeof PAGE_CONTENT_BLOCK_KINDS)[number];

export interface PageContentBlock {
  readonly id: string;
  readonly kind: PageContentBlockKind;
  readonly text: string;
  readonly headingPath?: readonly string[];
  readonly visible: boolean;
  readonly inViewport: boolean;
  readonly sourceFrameUrl?: string;
  readonly structure?: {
    readonly itemCount?: number;
    readonly rowCount?: number;
    readonly columnCount?: number;
    readonly headers?: readonly string[];
  };
}

export const PAGE_INTERACTIVE_ELEMENT_KINDS = [
  "link",
  "button",
  "input",
  "select",
  "textarea",
  "contenteditable",
  "control",
] as const;

export type PageInteractiveElementKind =
  (typeof PAGE_INTERACTIVE_ELEMENT_KINDS)[number];

/** A safe control description with an optional revision-bound action handle. */
export interface PageInteractiveElement {
  readonly id: string;
  readonly kind: PageInteractiveElementKind;
  readonly role: string;
  readonly name: string;
  readonly description?: string;
  readonly value?: string;
  readonly inputType?: string;
  readonly href?: string;
  readonly headingPath?: readonly string[];
  readonly visible: boolean;
  readonly inViewport: boolean;
  readonly disabled?: boolean;
  readonly checked?: boolean;
  readonly expanded?: boolean;
  readonly required?: boolean;
  readonly validationMessage?: string;
  readonly invalid?: boolean;
  readonly selected?: boolean;
  /** Revision-bound browser action handle, present only in tool snapshots. */
  readonly actionRef?: string;
  readonly formId?: string;
  readonly dialogId?: string;
  readonly regionRole?: string;
  readonly sourceFrameUrl?: string;
}

/** A provider-neutral, point-in-time reading of a browser document. */
export interface PageObservation {
  readonly schemaVersion: 1;
  readonly observationId: string;
  readonly tabId: string;
  readonly documentRevision: string;
  readonly capturedAt: string;
  readonly url: string;
  readonly title: string;
  readonly language?: string;
  readonly blocks: readonly PageContentBlock[];
  readonly interactiveElements?: readonly PageInteractiveElement[];
  readonly truncated: boolean;
}

export type ContextProvenance =
  | "user_selection"
  | "webpage"
  | "conversation"
  | "memory"
  | "tool_result";

export interface ContextItem {
  readonly id: string;
  readonly provenance: ContextProvenance;
  readonly content: string;
  readonly untrusted: boolean;
  readonly blockKind?: PageContentBlockKind;
  readonly headingPath?: readonly string[];
  readonly structure?: PageContentBlock["structure"];
  readonly interactiveElement?: Omit<
    PageInteractiveElement,
    "id" | "visible" | "inViewport" | "sourceFrameUrl" | "actionRef"
  >;
  readonly actionRef?: string;
  readonly documentRevision?: string;
  readonly groundingStatus?: "grounded" | "ambiguous" | "unavailable";
  readonly riskTags?: readonly ("prompt_injection" | "sensitive_input")[];
}

export type ContextAssemblyStrategy =
  | "selection"
  | "whole_document"
  | "semantic_blocks"
  | "retrieval"
  | "action_state";

export const CONTEXT_INTENTS = [
  "read",
  "locate",
  "navigate",
  "edit",
  "submit",
  "compare",
  "extract",
] as const;

export type ContextIntent = (typeof CONTEXT_INTENTS)[number];

export interface ContextManifest {
  readonly strategy: ContextAssemblyStrategy;
  readonly intent?: ContextIntent;
  readonly includedItemIds: readonly string[];
  readonly omittedItemCount: number;
  readonly truncated: boolean;
  readonly estimatedTokens: number;
  readonly sourceObservationIds: readonly string[];
}

export interface ContextBundle {
  readonly page: {
    readonly url: string;
    readonly title: string;
  };
  readonly items: readonly ContextItem[];
  readonly manifest: ContextManifest;
}
