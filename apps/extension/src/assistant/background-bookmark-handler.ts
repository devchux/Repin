import type { Bookmark } from "@repo/contracts/bookmark";
import {
  REPIN_PROTOCOL_VERSION,
  type ExtensionRequestMessage,
  type ExtensionResponseMessage,
} from "@repo/contracts/messages";
import {
  authenticatedFetch,
  getExtensionServerUrl,
} from "../auth/extension-auth-client";

type CreateBookmarkMessage = Extract<
  ExtensionRequestMessage,
  { type: "bookmark.create" }
>;

export const isCreateBookmarkMessage = (
  message: unknown,
): message is CreateBookmarkMessage =>
  Boolean(
    message &&
      typeof message === "object" &&
      "protocolVersion" in message &&
      message.protocolVersion === REPIN_PROTOCOL_VERSION &&
      "type" in message &&
      message.type === "bookmark.create" &&
      "payload" in message,
  );

export async function handleCreateBookmarkMessage(
  message: CreateBookmarkMessage,
): Promise<ExtensionResponseMessage> {
  try {
    const serverUrl = await getExtensionServerUrl();
    const response = await authenticatedFetch(`${serverUrl}/api/bookmarks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(message.payload),
    });
    const body = (await response.json().catch(() => null)) as
      | { data: Bookmark; created: boolean; message: string }
      | { message?: string }
      | null;
    if (!response.ok || !body || !("data" in body)) {
      throw new Error(body?.message ?? "Bookmark could not be saved");
    }
    return {
      protocolVersion: REPIN_PROTOCOL_VERSION,
      type: "bookmark.created",
      payload: { bookmark: body.data, created: body.created },
    };
  } catch (error) {
    return {
      protocolVersion: REPIN_PROTOCOL_VERSION,
      type: "bookmark.rejected",
      payload: {
        message:
          error instanceof Error ? error.message : "Bookmark could not be saved",
      },
    };
  }
}
