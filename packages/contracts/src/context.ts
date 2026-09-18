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
}

export type ContextAssemblyStrategy =
  | "selection"
  | "whole_document"
  | "semantic_blocks"
  | "retrieval"
  | "action_state";

export interface ContextManifest {
  readonly strategy: ContextAssemblyStrategy;
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
