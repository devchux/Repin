import type {
  CreateAssistantRunRequest,
  AssistantConversation,
  AssistantRun,
  BrowserActionApproval,
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

export const resumeAssistantRun = async (
  runId: string,
): Promise<AssistantRun> =>
  unwrapRun(
    await send({
      protocolVersion: REPIN_PROTOCOL_VERSION,
      type: "assistant.run.resume",
      payload: { runId },
    }),
    "assistant.run.updated",
  );

export const getAssistantRunApprovals = async (
  runId: string,
): Promise<readonly BrowserActionApproval[]> => {
  const response = await send({
    protocolVersion: REPIN_PROTOCOL_VERSION,
    type: "assistant.run.approvals.get",
    payload: { runId },
  });
  if (response.type === "assistant.run.rejected") {
    throw new Error(response.payload.message);
  }
  if (response.type !== "assistant.run.approvals.loaded") {
    throw new Error("Repin received an unexpected approval response");
  }
  return response.payload;
};

const decideAssistantRunApproval = async (
  runId: string,
  approvalId: string,
  decision: "approve" | "deny",
): Promise<AssistantRun> =>
  unwrapRun(
    await send({
      protocolVersion: REPIN_PROTOCOL_VERSION,
      type: `assistant.run.approval.${decision}`,
      payload: { approvalId, runId },
    }),
    "assistant.run.updated",
  );

export const approveAssistantRunAction = (runId: string, approvalId: string) =>
  decideAssistantRunApproval(runId, approvalId, "approve");

export const denyAssistantRunAction = (runId: string, approvalId: string) =>
  decideAssistantRunApproval(runId, approvalId, "deny");

export const getAssistantConversation = async (
  conversationId: string,
): Promise<AssistantConversation> => {
  const response = await send({
    protocolVersion: REPIN_PROTOCOL_VERSION,
    type: "assistant.conversation.get",
    payload: { conversationId },
  });
  if (response.type === "assistant.run.rejected") {
    throw new Error(response.payload.message);
  }
  if (response.type !== "assistant.conversation.loaded") {
    throw new Error("Repin received an unexpected conversation response");
  }
  return response.payload;
};

export const createAssistantConversationMessage = async (
  conversationId: string,
  content: string,
): Promise<AssistantRun> =>
  unwrapRun(
    await send({
      protocolVersion: REPIN_PROTOCOL_VERSION,
      type: "assistant.conversation.message.create",
      payload: {
        browserExecutionTarget: "extension",
        content,
        conversationId,
        executionLane: "short",
      },
    }),
    "assistant.run.accepted",
  );
