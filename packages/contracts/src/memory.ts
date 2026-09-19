export const MEMORY_KINDS = ["user", "agent"] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];

export const MEMORY_SCOPES = [
  "global",
  "project",
  "domain",
  "conversation",
] as const;
export type MemoryScope = (typeof MEMORY_SCOPES)[number];

export const MEMORY_SOURCE_TYPES = [
  "explicit_user",
  "conversation_message",
  "agent_run",
  "webpage",
  "note",
  "highlight",
  "bookmark",
] as const;
export type MemorySourceType = (typeof MEMORY_SOURCE_TYPES)[number];

export type MemoryTrust = "trusted" | "untrusted";

export interface MemorySource {
  readonly id: string;
  readonly type: MemorySourceType;
  readonly sourceId?: string;
  readonly url?: string;
  readonly trust: MemoryTrust;
  readonly observedAt: string;
  readonly createdAt: string;
}

export interface Memory {
  readonly id: string;
  readonly kind: MemoryKind;
  readonly content: string;
  readonly scope: MemoryScope;
  readonly scopeId?: string;
  readonly embeddingStatus: "pending" | "processing" | "complete" | "failed";
  readonly embeddingError?: string | null;
  readonly embeddedAt?: string | null;
  readonly sources: readonly MemorySource[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateMemoryFromSourceRequest {
  readonly sourceId: string;
  readonly content: string;
  readonly kind?: MemoryKind;
  readonly scope?: MemoryScope;
  readonly scopeId?: string;
}

export interface UpdateMemoryRequest {
  readonly content?: string;
  readonly scope?: MemoryScope;
  readonly scopeId?: string;
}

export type CreateMemoryFromBookmarkRequest = CreateMemoryFromSourceRequest;
export type CreateMemoryFromNoteRequest = CreateMemoryFromSourceRequest;
export type CreateMemoryFromHighlightRequest = CreateMemoryFromSourceRequest;
