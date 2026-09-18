import type {
  CreateHighlightRequest,
  HighlightsPage,
  SavedHighlight,
} from "@repo/contracts/highlight";
import {
  REPIN_PROTOCOL_VERSION,
  type ExtensionResponseMessage,
} from "@repo/contracts/messages";

export async function createHighlight(
  payload: CreateHighlightRequest,
): Promise<SavedHighlight> {
  const response = (await browser.runtime.sendMessage({
    protocolVersion: REPIN_PROTOCOL_VERSION,
    type: "highlight.create",
    payload,
  })) as ExtensionResponseMessage;
  if (response.type === "highlight.rejected") {
    throw new Error(response.payload.message);
  }
  if (response.type !== "highlight.created") {
    throw new Error("Repin received an unexpected highlight response");
  }
  return response.payload;
}

export async function listHighlights(
  url: string,
  page = 1,
): Promise<HighlightsPage> {
  const response = (await browser.runtime.sendMessage({
    protocolVersion: REPIN_PROTOCOL_VERSION,
    type: "highlight.list",
    payload: { url, page },
  })) as ExtensionResponseMessage;
  if (response.type === "highlight.rejected") {
    throw new Error(response.payload.message);
  }
  if (response.type !== "highlight.listed") {
    throw new Error("Repin received an unexpected highlight response");
  }
  return response.payload;
}
