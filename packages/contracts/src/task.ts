import type {
  AssistantRun,
  CreateAssistantRunRequest,
} from "./assistant";
import type { WorkflowInstance } from "./workflow";

export type TaskSelectionMode = "auto" | "assistant" | "workflow";

export interface DispatchTaskRequest extends CreateAssistantRunRequest {
  readonly selectionMode?: TaskSelectionMode;
  readonly workflowDefinitionId?: string;
}

export type TaskDispatchResult =
  | ({ readonly kind: "run"; readonly reason: string } & AssistantRun)
  | ({ readonly kind: "workflow"; readonly reason: string } & Omit<
      WorkflowInstance,
      "definition" | "events" | "nodeExecutions"
    >);
