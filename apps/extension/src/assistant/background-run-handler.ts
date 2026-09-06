import type {
  AssistantConversation,
  AssistantRun,
} from "@repo/contracts/assistant";
import {
  REPIN_PROTOCOL_VERSION,
  type ExtensionRequestMessage,
  type ExtensionResponseMessage,
} from "@repo/contracts/messages";

import {
  authenticatedFetch,
  getExtensionServerUrl,
} from "../auth/extension-auth-client";

type ApiEnvelope<T> = { data: T; message: string };

const readRun = async (response: Response): Promise<AssistantRun> => {
  const body = (await response.json().catch(() => null)) as
    | ApiEnvelope<AssistantRun>
    | { error?: string; message?: string }
    | null;
  if (!response.ok || !body || !("data" in body)) {
    throw new Error(
      body && "error" in body
        ? body.error ?? body.message ?? "Assistant request failed"
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
        ? body.error ?? body.message ?? "Conversation request failed"
        : "Conversation request failed",
    );
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
    message.type === "assistant.conversation.get" ||
    message.type === "assistant.conversation.message.create"
  );
};

export const handleAssistantRunMessage = async (
  message: ExtensionRequestMessage,
): Promise<ExtensionResponseMessage> => {
  try {
    const serverUrl = await getExtensionServerUrl();
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
      const run = await readRun(
        await authenticatedFetch(
          `${serverUrl}/api/assistant/conversations/${conversationId}/messages`,
          {
            body: JSON.stringify(payload),
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
      const run = await readRun(
        await authenticatedFetch(`${serverUrl}/api/assistant/runs`, {
          body: JSON.stringify(message.payload),
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

    const endpoint = `${serverUrl}/api/assistant/runs/${message.payload.runId}`;
    const run = await readRun(
      await authenticatedFetch(
        message.type === "assistant.run.cancel" ? `${endpoint}/cancel` : endpoint,
        { method: message.type === "assistant.run.cancel" ? "POST" : "GET" },
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
