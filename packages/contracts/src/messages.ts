import type {
  AssistantCapability,
  AssistantRun,
  CreateAssistantRunRequest,
} from "./assistant";

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
    };

export type ExtensionResponseMessage =
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "assistant.run.accepted";
      readonly payload: AssistantRun;
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
