import type {
  CreateBookmarkRequest,
  CreateBookmarkResult,
} from "@repo/contracts/bookmark";
import {
  REPIN_PROTOCOL_VERSION,
  type ExtensionResponseMessage,
} from "@repo/contracts/messages";

export async function createBookmark(
  payload: CreateBookmarkRequest,
): Promise<CreateBookmarkResult> {
  const response = (await browser.runtime.sendMessage({
    protocolVersion: REPIN_PROTOCOL_VERSION,
    type: "bookmark.create",
    payload,
  })) as ExtensionResponseMessage;
  if (response.type === "bookmark.rejected") {
    throw new Error(response.payload.message);
  }
  if (response.type !== "bookmark.created") {
    throw new Error("Repin received an unexpected bookmark response");
  }
  return response.payload;
}
