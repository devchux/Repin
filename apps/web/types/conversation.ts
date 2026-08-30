import { AssistantConversationSummary } from "@repo/contracts/assistant";

export type ConversationType =
  | "all"
  | AssistantConversationSummary["initialCapability"];
export type UpdatedRange = "any" | "day" | "week" | "month";
export type ConversationSort = "recent" | "created" | "oldest" | "messages";
