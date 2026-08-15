import type { PageContext } from "./browser";

export const ASSISTANT_CAPABILITIES = [
  "summarize",
  "explain",
  "translate",
  "note",
  "save",
  "chat",
] as const;

export type AssistantCapability = (typeof ASSISTANT_CAPABILITIES)[number];

export const AI_ASSISTANT_CAPABILITIES = [
  "summarize",
  "explain",
  "translate",
  "chat",
] as const satisfies readonly AssistantCapability[];

export type AiAssistantCapability = (typeof AI_ASSISTANT_CAPABILITIES)[number];

export const ASSISTANT_RUN_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;

export type AssistantRunStatus = (typeof ASSISTANT_RUN_STATUSES)[number];

export interface CreateAssistantRunRequest {
  readonly capability: AiAssistantCapability;
  readonly context: PageContext;
  readonly input?: string;
  readonly options?: AssistantRunOptions;
  readonly browserSessionId?: string;
  readonly browserExecutionTarget?: "extension" | "managed";
}

export interface AssistantRunOptions {
  readonly targetLanguage?: string;
}

export interface AssistantRun {
  readonly id: string;
  readonly conversationId: string;
  readonly capability: AiAssistantCapability;
  readonly status: AssistantRunStatus;
  readonly result?: string;
  readonly error?: string;
  readonly provider?: string;
  readonly model?: string;
  readonly usage?: AssistantRunUsage;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly startedAt?: string;
  readonly queueWaitMs?: number;
  readonly completedAt?: string;
  readonly cancelledAt?: string;
}

export interface AssistantRunUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export type AssistantRunEventType = AssistantRunStatus | "heartbeat";

export interface AssistantRunEvent {
  readonly type: AssistantRunEventType;
  readonly data: AssistantRun | { readonly runId: string };
}

export interface AssistantConversation {
  readonly id: string;
  readonly initialCapability: AiAssistantCapability;
  readonly context: PageContext;
  readonly messages: readonly AssistantConversationMessage[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AssistantConversationMessage {
  readonly id: string;
  readonly runId?: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly createdAt: string;
}

export interface CreateConversationMessageRequest {
  readonly content: string;
  readonly browserSessionId?: string;
  readonly browserExecutionTarget?: "extension" | "managed";
}
