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
  "awaiting_approval",
  "suspended",
  "completed",
  "failed",
  "cancelled",
] as const;

export type AssistantRunStatus = (typeof ASSISTANT_RUN_STATUSES)[number];

export const ASSISTANT_EXECUTION_LANES = ["short", "long"] as const;
export type AssistantExecutionLane = (typeof ASSISTANT_EXECUTION_LANES)[number];

export const ASSISTANT_RUN_PHASES = [
  "queued",
  "initializing",
  "reasoning",
  "executing",
  "awaiting_approval",
  "suspended",
  "finalizing",
  "terminal",
] as const;

export type AssistantRunPhase = (typeof ASSISTANT_RUN_PHASES)[number];

export const ASSISTANT_STEP_TYPES = ["model", "tool", "verification"] as const;
export type AssistantStepType = (typeof ASSISTANT_STEP_TYPES)[number];

export const ASSISTANT_STEP_STATUSES = [
  "running",
  "completed",
  "failed",
] as const;
export type AssistantStepStatus = (typeof ASSISTANT_STEP_STATUSES)[number];

export type AssistantAgentDecision =
  | {
      readonly kind: "tool";
      readonly calls: readonly {
        readonly id: string;
        readonly name: string;
        readonly arguments: Readonly<Record<string, unknown>>;
      }[];
    }
  | { readonly kind: "complete"; readonly content: string };

export interface CreateAssistantRunRequest {
  readonly capability: AiAssistantCapability;
  readonly context: PageContext;
  readonly input?: string;
  readonly options?: AssistantRunOptions;
  readonly browserSessionId?: string;
  readonly browserExecutionTarget?: "extension" | "managed";
  readonly executionLane?: AssistantExecutionLane;
}

export interface AssistantRunOptions {
  readonly targetLanguage?: string;
}

export interface AssistantRun {
  readonly id: string;
  readonly conversationId: string;
  readonly capability: AiAssistantCapability;
  readonly status: AssistantRunStatus;
  readonly phase: AssistantRunPhase;
  readonly executionLane: AssistantExecutionLane;
  readonly context: PageContext;
  readonly input?: string;
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
  readonly execution: {
    readonly modelCalls: number;
    readonly maxModelCalls: number;
    readonly toolCalls: number;
    readonly maxToolCalls: number;
  };
}

export interface AssistantRunUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export interface BrowserActionApproval {
  readonly id: string;
  readonly toolName: string;
  readonly arguments: Readonly<Record<string, unknown>>;
  readonly effect: string;
  readonly reason: string;
  readonly expiresAt: string;
  readonly createdAt: string;
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

export interface AssistantConversationSummary {
  readonly id: string;
  readonly initialCapability: AiAssistantCapability;
  readonly title: string;
  readonly preview: string;
  readonly messageCount: number;
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
  readonly executionLane?: AssistantExecutionLane;
}
