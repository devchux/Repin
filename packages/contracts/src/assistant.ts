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
  readonly id: number;
  readonly capability: AiAssistantCapability;
  readonly status: AssistantRunStatus;
  readonly context: PageContext;
  readonly input?: string;
  readonly result?: AssistantRunResult;
  readonly error?: AssistantRunError;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt?: string;
}

export type AssistantRunResult =
  | TextAssistantRunResult
  | TranslationAssistantRunResult
  | ChatAssistantRunResult;

export interface TextAssistantRunResult {
  readonly type: "text";
  readonly content: string;
}

export interface TranslationAssistantRunResult {
  readonly type: "translation";
  readonly content: string;
  readonly sourceLanguage?: string;
  readonly targetLanguage: string;
}

export interface ChatAssistantRunResult {
  readonly type: "chat-message";
  readonly content: string;
  readonly conversationId: number;
  readonly messageId: number;
}

export const ASSISTANT_RUN_ERROR_CODES = [
  "invalid_context",
  "unsupported_capability",
  "provider_unavailable",
  "rate_limited",
  "run_cancelled",
  "internal_error",
] as const;

export type AssistantRunErrorCode =
  (typeof ASSISTANT_RUN_ERROR_CODES)[number];

export interface AssistantRunError {
  readonly code: AssistantRunErrorCode;
  readonly message: string;
  readonly retryable: boolean;
}
