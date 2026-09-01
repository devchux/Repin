import type {
  CreateAssistantRunRequest,
  AssistantRun,
} from "@repo/contracts/assistant";
import {
  REPIN_PROTOCOL_VERSION,
  type ExtensionRequestMessage,
  type ExtensionResponseMessage,
} from "@repo/contracts/messages";

const send = async (
  message: ExtensionRequestMessage,
): Promise<ExtensionResponseMessage> =>
  (await browser.runtime.sendMessage(message)) as ExtensionResponseMessage;

const unwrapRun = (
  response: ExtensionResponseMessage,
  expectedType: "assistant.run.accepted" | "assistant.run.updated",
): AssistantRun => {
  if (response.type === "assistant.run.rejected") {
    throw new Error(response.payload.message);
  }
  if (response.type !== expectedType) {
    throw new Error("Repin received an unexpected assistant response");
  }
  return response.payload;
};

export const createAssistantRun = async (
  payload: CreateAssistantRunRequest,
): Promise<AssistantRun> =>
  unwrapRun(
    await send({
      protocolVersion: REPIN_PROTOCOL_VERSION,
      type: "assistant.run.create",
      payload,
    }),
    "assistant.run.accepted",
  );

export const getAssistantRun = async (runId: string): Promise<AssistantRun> =>
  unwrapRun(
    await send({
      protocolVersion: REPIN_PROTOCOL_VERSION,
      type: "assistant.run.get",
      payload: { runId },
    }),
    "assistant.run.updated",
  );

export const cancelAssistantRun = async (
  runId: string,
): Promise<AssistantRun> =>
  unwrapRun(
    await send({
      protocolVersion: REPIN_PROTOCOL_VERSION,
      type: "assistant.run.cancel",
      payload: { runId },
    }),
    "assistant.run.updated",
  );
