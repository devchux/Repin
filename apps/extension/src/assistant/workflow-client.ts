import type { DispatchTaskRequest, TaskDispatchResult } from "@repo/contracts/task";
import type { WorkflowInstance } from "@repo/contracts/workflow";
import {
  REPIN_PROTOCOL_VERSION,
  type ExtensionRequestMessage,
  type ExtensionResponseMessage,
} from "@repo/contracts/messages";

const send = async (
  message: ExtensionRequestMessage,
): Promise<ExtensionResponseMessage> =>
  (await browser.runtime.sendMessage(message)) as ExtensionResponseMessage;

const unwrapWorkflow = (response: ExtensionResponseMessage): WorkflowInstance => {
  if (response.type === "assistant.run.rejected") {
    throw new Error(response.payload.message);
  }
  if (response.type !== "workflow.instance.loaded") {
    throw new Error("Repin received an unexpected workflow response");
  }
  return response.payload;
};

export const dispatchTask = async (
  payload: DispatchTaskRequest,
): Promise<TaskDispatchResult> => {
  const response = await send({
    protocolVersion: REPIN_PROTOCOL_VERSION,
    type: "task.dispatch",
    payload,
  });
  if (response.type === "assistant.run.rejected") {
    throw new Error(response.payload.message);
  }
  if (response.type !== "task.dispatched") {
    throw new Error("Repin received an unexpected task response");
  }
  return response.payload;
};

export const getWorkflowInstance = async (instanceId: string) =>
  unwrapWorkflow(
    await send({
      protocolVersion: REPIN_PROTOCOL_VERSION,
      type: "workflow.instance.get",
      payload: { instanceId },
    }),
  );

export const cancelWorkflowInstance = async (instanceId: string) =>
  unwrapWorkflow(
    await send({
      protocolVersion: REPIN_PROTOCOL_VERSION,
      type: "workflow.instance.cancel",
      payload: { instanceId },
    }),
  );
