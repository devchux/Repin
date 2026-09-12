import type {
  AssistantConversation,
  AssistantRun,
  BrowserActionApproval,
} from "@repo/contracts/assistant";
import type { TaskDispatchResult } from "@repo/contracts/task";
import type { WorkflowInstance } from "@repo/contracts/workflow";
import {
  REPIN_PROTOCOL_VERSION,
  type ExtensionRequestMessage,
  type ExtensionResponseMessage,
} from "@repo/contracts/messages";

import {
  authenticatedFetch,
  getExtensionServerUrl,
} from "../auth/extension-auth-client";
import { getBrowserSessionId } from "../browser-tools/browser-session-client";

type ApiEnvelope<T> = { data: T; message: string };

const readRun = async (response: Response): Promise<AssistantRun> => {
  const body = (await response.json().catch(() => null)) as
    | ApiEnvelope<AssistantRun>
    | { error?: string; message?: string }
    | null;
  if (!response.ok || !body || !("data" in body)) {
    throw new Error(
      body && "error" in body
        ? (body.error ?? body.message ?? "Assistant request failed")
        : "Assistant request failed",
    );
  }
  return body.data;
};

const readConversation = async (
  response: Response,
): Promise<AssistantConversation> => {
  const body = (await response.json().catch(() => null)) as
    | ApiEnvelope<AssistantConversation>
    | { error?: string; message?: string }
    | null;
  if (!response.ok || !body || !("data" in body)) {
    throw new Error(
      body && "error" in body
        ? (body.error ?? body.message ?? "Conversation request failed")
        : "Conversation request failed",
    );
  }
  return body.data;
};

const readData = async <T>(
  response: Response,
  fallback: string,
): Promise<T> => {
  const body = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | { error?: string; message?: string }
    | null;
  if (!response.ok || !body || !("data" in body)) {
    throw new Error(body?.message ?? fallback);
  }
  return body.data;
};

export const isAssistantRunMessage = (
  message: unknown,
): message is ExtensionRequestMessage => {
  if (
    !message ||
    typeof message !== "object" ||
    !("protocolVersion" in message) ||
    message.protocolVersion !== REPIN_PROTOCOL_VERSION ||
    !("type" in message)
  ) {
    return false;
  }
  return (
    message.type === "assistant.run.create" ||
    message.type === "assistant.run.get" ||
    message.type === "assistant.run.cancel" ||
    message.type === "assistant.run.resume" ||
    message.type === "assistant.run.approvals.get" ||
    message.type === "assistant.run.approval.approve" ||
    message.type === "assistant.run.approval.deny" ||
    message.type === "assistant.conversation.get" ||
    message.type === "assistant.conversation.message.create" ||
    message.type === "task.dispatch" ||
    message.type === "workflow.instance.get" ||
    message.type === "workflow.instance.cancel"
  );
};

export const handleAssistantRunMessage = async (
  message: ExtensionRequestMessage,
): Promise<ExtensionResponseMessage> => {
  try {
    const serverUrl = await getExtensionServerUrl();
    if (message.type === "task.dispatch") {
      const browserSessionId =
        message.payload.browserSessionId ?? (await getBrowserSessionId());
      const result = await readData<TaskDispatchResult>(
        await authenticatedFetch(`${serverUrl}/api/tasks`, {
          body: JSON.stringify({ ...message.payload, browserSessionId }),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
        "Task dispatch failed",
      );
      return {
        protocolVersion: REPIN_PROTOCOL_VERSION,
        type: "task.dispatched",
        payload: result,
      };
    }
    if (
      message.type === "workflow.instance.get" ||
      message.type === "workflow.instance.cancel"
    ) {
      const endpoint = `${serverUrl}/api/workflows/instances/${message.payload.instanceId}`;
      const instance = await readData<WorkflowInstance>(
        await authenticatedFetch(
          message.type === "workflow.instance.cancel"
            ? `${endpoint}/cancel`
            : endpoint,
          {
            method:
              message.type === "workflow.instance.cancel" ? "POST" : "GET",
          },
        ),
        "Workflow request failed",
      );
      return {
        protocolVersion: REPIN_PROTOCOL_VERSION,
        type: "workflow.instance.loaded",
        payload: instance,
      };
    }
    if (message.type === "assistant.conversation.get") {
      const conversation = await readConversation(
        await authenticatedFetch(
          `${serverUrl}/api/assistant/conversations/${message.payload.conversationId}`,
          { method: "GET" },
        ),
      );
      return {
        protocolVersion: REPIN_PROTOCOL_VERSION,
        type: "assistant.conversation.loaded",
        payload: conversation,
      };
    }
    if (message.type === "assistant.conversation.message.create") {
      const { conversationId, ...payload } = message.payload;
      const browserSessionId =
        payload.browserSessionId ?? (await getBrowserSessionId());
      const run = await readRun(
        await authenticatedFetch(
          `${serverUrl}/api/assistant/conversations/${conversationId}/messages`,
          {
            body: JSON.stringify({ ...payload, browserSessionId }),
            headers: { "content-type": "application/json" },
            method: "POST",
          },
        ),
      );
      return {
        protocolVersion: REPIN_PROTOCOL_VERSION,
        type: "assistant.run.accepted",
        payload: run,
      };
    }
    if (message.type === "assistant.run.create") {
      const browserSessionId =
        message.payload.browserSessionId ?? (await getBrowserSessionId());
      const run = await readRun(
        await authenticatedFetch(`${serverUrl}/api/assistant/runs`, {
          body: JSON.stringify({ ...message.payload, browserSessionId }),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
      );
      return {
        protocolVersion: REPIN_PROTOCOL_VERSION,
        type: "assistant.run.accepted",
        payload: run,
      };
    }

    if (message.type === "assistant.run.approvals.get") {
      const approvals = await readData<BrowserActionApproval[]>(
        await authenticatedFetch(
          `${serverUrl}/api/assistant/runs/${message.payload.runId}/approvals`,
          { method: "GET" },
        ),
        "Could not load the proposed browser action",
      );
      return {
        protocolVersion: REPIN_PROTOCOL_VERSION,
        type: "assistant.run.approvals.loaded",
        payload: approvals,
      };
    }

    if (
      message.type === "assistant.run.approval.approve" ||
      message.type === "assistant.run.approval.deny"
    ) {
      const decision =
        message.type === "assistant.run.approval.approve" ? "approve" : "deny";
      const run = await readRun(
        await authenticatedFetch(
          `${serverUrl}/api/assistant/runs/${message.payload.runId}/approvals/${message.payload.approvalId}/${decision}`,
          { method: "POST" },
        ),
      );
      return {
        protocolVersion: REPIN_PROTOCOL_VERSION,
        type: "assistant.run.updated",
        payload: run,
      };
    }

    if (
      message.type !== "assistant.run.get" &&
      message.type !== "assistant.run.cancel" &&
      message.type !== "assistant.run.resume"
    ) {
      throw new Error("Unsupported assistant request");
    }
    const endpoint = `${serverUrl}/api/assistant/runs/${message.payload.runId}`;
    const run = await readRun(
      await authenticatedFetch(
        message.type === "assistant.run.cancel"
          ? `${endpoint}/cancel`
          : message.type === "assistant.run.resume"
            ? `${endpoint}/resume`
            : endpoint,
        { method: message.type === "assistant.run.get" ? "GET" : "POST" },
      ),
    );
    return {
      protocolVersion: REPIN_PROTOCOL_VERSION,
      type: "assistant.run.updated",
      payload: run,
    };
  } catch (error) {
    return {
      protocolVersion: REPIN_PROTOCOL_VERSION,
      type: "assistant.run.rejected",
      payload: {
        message:
          error instanceof Error ? error.message : "Assistant request failed",
      },
    };
  }
};
