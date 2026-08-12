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
}

export interface AssistantRunOptions {
  readonly targetLanguage?: string;
  readonly conversationId?: number;
}

export interface AssistantRun {
  readonly id: string;
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
