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
