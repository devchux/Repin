import type {
  AssistantCapability,
  AssistantConversation,
  AssistantRun,
  CreateConversationMessageRequest,
  CreateAssistantRunRequest,
} from "./assistant";
import type { DispatchTaskRequest, TaskDispatchResult } from "./task";
import type { WorkflowInstance } from "./workflow";

export const REPIN_PROTOCOL_VERSION = 1 as const;

/** Messages exchanged between extension contexts, not server transport DTOs. */
export type ExtensionRequestMessage =
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "assistant.run.create";
      readonly payload: CreateAssistantRunRequest;
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "assistant.run.get" | "assistant.run.cancel";
      readonly payload: AssistantRunReference;
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "assistant.conversation.get";
      readonly payload: { readonly conversationId: string };
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "assistant.conversation.message.create";
      readonly payload: CreateConversationMessageRequest & {
        readonly conversationId: string;
      };
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "task.dispatch";
      readonly payload: DispatchTaskRequest;
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "workflow.instance.get" | "workflow.instance.cancel";
      readonly payload: { readonly instanceId: string };
    };

export type ExtensionResponseMessage =
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "assistant.run.accepted";
      readonly payload: AssistantRun;
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "assistant.conversation.loaded";
      readonly payload: AssistantConversation;
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "task.dispatched";
      readonly payload: TaskDispatchResult;
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "workflow.instance.loaded";
      readonly payload: WorkflowInstance;
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "assistant.run.updated";
      readonly payload: AssistantRun;
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "assistant.run.rejected";
      readonly payload: {
        readonly message: string;
      };
    };

export interface AssistantRunReference {
  readonly runId: string;
}

export interface OpenExtensionSidebarMessage {
  readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
  readonly type: "repin.sidebar.open";
  readonly payload: {
    readonly mode: AssistantCapability;
    readonly requestId: string;
  };
}
