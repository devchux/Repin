import type {
  AiAssistantCapability,
  AssistantExecutionLane,
  AssistantRunOptions,
} from "./assistant";
import type { PageContext } from "./browser";

export const WORKFLOW_INSTANCE_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;
export type WorkflowInstanceStatus =
  (typeof WORKFLOW_INSTANCE_STATUSES)[number];

export const WORKFLOW_NODE_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;
export type WorkflowNodeStatus = (typeof WORKFLOW_NODE_STATUSES)[number];

export type WorkflowNode =
  | {
      readonly id: string;
      readonly type: "agent";
      readonly capability: AiAssistantCapability;
      readonly context: PageContext;
      readonly input?: string;
      readonly contextSource?: "definition" | "task";
      readonly inputSource?: "definition" | "task";
      readonly options?: AssistantRunOptions;
      readonly browserSessionId?: string;
      readonly browserExecutionTarget?: "extension" | "managed";
      readonly executionLane?: AssistantExecutionLane;
    }
  | {
      readonly id: string;
      readonly type: "condition";
      readonly inputKey: string;
      readonly operator: "exists" | "equals";
      readonly value?: unknown;
    }
  | { readonly id: string; readonly type: "end" };

export interface WorkflowEdge {
  readonly from: string;
  readonly to: string;
  readonly outcome?: "true" | "false";
}

export interface WorkflowGraph {
  readonly startNodeId: string;
  readonly nodes: readonly WorkflowNode[];
  readonly edges: readonly WorkflowEdge[];
}

export interface CreateWorkflowDefinitionRequest {
  readonly key: string;
  readonly name: string;
  readonly description?: string;
  readonly activation?: WorkflowActivation;
  readonly graph: WorkflowGraph;
}

export interface WorkflowActivation {
  readonly description: string;
  readonly examples: readonly string[];
}

export interface StartWorkflowRequest {
  readonly input?: Readonly<Record<string, unknown>>;
}
