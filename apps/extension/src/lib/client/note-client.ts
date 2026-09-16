import type { CreateNoteRequest, Note } from "@repo/contracts/note";
import {
  REPIN_PROTOCOL_VERSION,
  type ExtensionResponseMessage,
} from "@repo/contracts/messages";

export const createNote = async (payload: CreateNoteRequest): Promise<Note> => {
  const response = (await browser.runtime.sendMessage({
    protocolVersion: REPIN_PROTOCOL_VERSION,
    type: "note.create",
    payload,
  })) as ExtensionResponseMessage;
  if (response.type === "note.rejected") {
    throw new Error(response.payload.message);
  }
  if (response.type !== "note.created") {
    throw new Error("Repin received an unexpected note response");
  }
  return response.payload;
};
