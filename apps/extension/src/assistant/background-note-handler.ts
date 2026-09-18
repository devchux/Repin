import type { Note } from "@repo/contracts/note";
import {
  REPIN_PROTOCOL_VERSION,
  type ExtensionRequestMessage,
  type ExtensionResponseMessage,
} from "@repo/contracts/messages";
import {
  authenticatedFetch,
  getExtensionServerUrl,
} from "../auth/extension-auth-client";

export const isCreateNoteMessage = (
  message: unknown,
): message is Extract<ExtensionRequestMessage, { type: "note.create" }> =>
  Boolean(
    message &&
      typeof message === "object" &&
      "protocolVersion" in message &&
      message.protocolVersion === REPIN_PROTOCOL_VERSION &&
      "type" in message &&
      message.type === "note.create" &&
      "payload" in message,
  );

export const handleCreateNoteMessage = async (
  message: Extract<ExtensionRequestMessage, { type: "note.create" }>,
): Promise<ExtensionResponseMessage> => {
  try {
    const serverUrl = await getExtensionServerUrl();
    const response = await authenticatedFetch(`${serverUrl}/api/notes`, {
      body: JSON.stringify(message.payload),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const body = (await response.json().catch(() => null)) as
      | { data: Note; message: string }
      | { message?: string }
      | null;
    if (!response.ok || !body || !("data" in body)) {
      throw new Error(body?.message ?? "Note could not be saved");
    }
    return {
      protocolVersion: REPIN_PROTOCOL_VERSION,
      type: "note.created",
      payload: body.data,
    };
  } catch (error) {
    return {
      protocolVersion: REPIN_PROTOCOL_VERSION,
      type: "note.rejected",
      payload: {
        message: error instanceof Error ? error.message : "Note could not be saved",
      },
    };
  }
};
