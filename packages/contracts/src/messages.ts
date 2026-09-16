import type {
  AssistantCapability,
  AssistantConversation,
  AssistantRun,
  BrowserActionApproval,
  CreateConversationMessageRequest,
  CreateAssistantRunRequest,
} from "./assistant";
import type { DispatchTaskRequest, TaskDispatchResult } from "./task";
import type { WorkflowInstance } from "./workflow";
import type { CreateNoteRequest, Note } from "./note";
import type {
  CreateHighlightRequest,
  HighlightsPage,
  SavedHighlight,
} from "./highlight";
import type {
  CreateBookmarkRequest,
  CreateBookmarkResult,
} from "./bookmark";

export const REPIN_PROTOCOL_VERSION = 1 as const;

/** Messages exchanged between extension contexts, not server transport DTOs. */
export type ExtensionRequestMessage =
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "bookmark.create";
      readonly payload: CreateBookmarkRequest;
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "note.create";
      readonly payload: CreateNoteRequest;
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "highlight.create";
      readonly payload: CreateHighlightRequest;
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "highlight.list";
      readonly payload: { readonly url: string; readonly page: number };
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "assistant.run.create";
      readonly payload: CreateAssistantRunRequest;
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type:
        | "assistant.run.get"
        | "assistant.run.cancel"
        | "assistant.run.resume";
      readonly payload: AssistantRunReference;
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "assistant.run.approvals.get";
      readonly payload: AssistantRunReference;
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type:
        | "assistant.run.approval.approve"
        | "assistant.run.approval.deny";
      readonly payload: AssistantRunReference & { readonly approvalId: string };
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
      readonly type: "bookmark.created";
      readonly payload: CreateBookmarkResult;
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "bookmark.rejected";
      readonly payload: { readonly message: string };
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "note.created";
      readonly payload: Note;
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "highlight.created";
      readonly payload: SavedHighlight;
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "highlight.listed";
      readonly payload: HighlightsPage;
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "highlight.rejected";
      readonly payload: { readonly message: string };
    }
  | {
      readonly protocolVersion: typeof REPIN_PROTOCOL_VERSION;
      readonly type: "note.rejected";
      readonly payload: { readonly message: string };
    }
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
      readonly type: "assistant.run.approvals.loaded";
      readonly payload: readonly BrowserActionApproval[];
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
