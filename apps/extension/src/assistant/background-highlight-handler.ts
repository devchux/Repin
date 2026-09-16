import type { HighlightsPage, SavedHighlight } from "@repo/contracts/highlight";
import {
  REPIN_PROTOCOL_VERSION,
  type ExtensionRequestMessage,
  type ExtensionResponseMessage,
} from "@repo/contracts/messages";
import {
  authenticatedFetch,
  getExtensionServerUrl,
} from "../auth/extension-auth-client";

type HighlightRequest = Extract<
  ExtensionRequestMessage,
  { type: "highlight.create" | "highlight.list" }
>;

export const isHighlightMessage = (
  message: unknown,
): message is HighlightRequest =>
  Boolean(
    message &&
    typeof message === "object" &&
    "protocolVersion" in message &&
    message.protocolVersion === REPIN_PROTOCOL_VERSION &&
    "type" in message &&
    (message.type === "highlight.create" ||
      message.type === "highlight.list") &&
    "payload" in message,
  );

export async function handleHighlightMessage(
  message: HighlightRequest,
  tabId?: number,
): Promise<ExtensionResponseMessage> {
  try {
    const serverUrl = await getExtensionServerUrl();
    if (message.type === "highlight.create") {
      const response = await authenticatedFetch(`${serverUrl}/api/highlights`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(message.payload),
      });
      const body = (await response.json().catch(() => null)) as
        | { data: SavedHighlight; message: string }
        | { message?: string }
        | null;
      if (!response.ok || !body || !("data" in body)) {
        throw new Error(body?.message ?? "Highlight could not be saved");
      }
      if (tabId !== undefined) {
        void browser.tabs
          .sendMessage(tabId, {
            protocolVersion: REPIN_PROTOCOL_VERSION,
            type: "repin.highlight.saved",
            payload: body.data,
          })
          .catch((error: unknown) =>
            console.warn(
              "Repin could not update highlights in the source tab",
              error,
            ),
          );
      }
      return {
        protocolVersion: REPIN_PROTOCOL_VERSION,
        type: "highlight.created",
        payload: body.data,
      };
    }

    const params = new URLSearchParams({
      url: message.payload.url,
      page: String(message.payload.page),
      limit: "100",
    });
    const response = await authenticatedFetch(
      `${serverUrl}/api/highlights?${params.toString()}`,
    );
    const body = (await response.json().catch(() => null)) as
      | { data: HighlightsPage; message: string }
      | { message?: string }
      | null;
    if (!response.ok || !body || !("data" in body)) {
      throw new Error(body?.message ?? "Highlights could not be loaded");
    }
    return {
      protocolVersion: REPIN_PROTOCOL_VERSION,
      type: "highlight.listed",
      payload: body.data,
    };
  } catch (error) {
    return {
      protocolVersion: REPIN_PROTOCOL_VERSION,
      type: "highlight.rejected",
      payload: {
        message:
          error instanceof Error ? error.message : "Highlight request failed",
      },
    };
  }
}
