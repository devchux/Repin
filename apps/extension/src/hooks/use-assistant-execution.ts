import type {
  AiAssistantCapability,
  AssistantRun,
  BrowserActionApproval,
} from "@repo/contracts/assistant";
import { useCallback, useEffect, useState } from "react";

import {
  cancelAssistantRun,
  approveAssistantRunAction,
  createAssistantConversationMessage,
  createAssistantRun,
  denyAssistantRunAction,
  getAssistantRun,
  getAssistantRunApprovals,
  resumeAssistantRun,
} from "../assistant/assistant-run-client";
import { extractPageContext } from "../lib/page-context";
import { dispatchTask } from "../assistant/workflow-client";
import { useEventStream } from "./use-event-stream";

const TERMINAL_STATUSES = new Set<AssistantRun["status"]>([
  "cancelled",
  "completed",
  "failed",
]);
const MAX_POLL_FAILURES = 3;

type AssistantRunState = {
  approvalError?: string;
  approvals: readonly BrowserActionApproval[];
  cancelling: boolean;
  decidingApproval?: "approve" | "deny";
  decidingApprovalId?: string;
  error?: string;
  resuming: boolean;
  run?: AssistantRun;
  starting: boolean;
};

const initialState: AssistantRunState = {
  approvals: [],
  cancelling: false,
  resuming: false,
  starting: false,
};

export const useAssistantExecution = (
  capability: AiAssistantCapability,
  enabled: boolean,
  requestId: string,
  selectedText: string,
  targetLanguage?: string,
  input?: string,
) => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<AssistantRunState>(initialState);
  const [workflowInstanceId, setWorkflowInstanceId] = useState<string>();
  const trackRun = useCallback(async (run: AssistantRun) => {
    setState((current) => ({
      ...current,
      approvalError: undefined,
      approvals: run.status === "awaiting_approval" ? current.approvals : [],
      cancelling: false,
      decidingApproval: undefined,
      decidingApprovalId: undefined,
      error: undefined,
      resuming: false,
      run,
      starting: false,
    }));
  }, []);

  const streamStatus = useEventStream(
    "assistant-run",
    state.run?.id,
    (event) => {
      if (
        event.data &&
        typeof event.data === "object" &&
        "id" in event.data &&
        "status" in event.data
      ) {
        void trackRun(event.data as AssistantRun);
      }
    },
  );
  const activeRunId = state.run?.id;
  const activeRunStatus = state.run?.status;

  useEffect(() => {
    if (
      !activeRunId ||
      (activeRunStatus && TERMINAL_STATUSES.has(activeRunStatus)) ||
      streamStatus === "connected"
    ) {
      return;
    }
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const poll = async () => {
      try {
        await trackRun(await getAssistantRun(activeRunId));
        failures = 0;
      } catch (error) {
        failures += 1;
        if (failures >= MAX_POLL_FAILURES && !disposed) {
          setState((current) => ({
            ...current,
            error:
              error instanceof Error
                ? error.message
                : "Repin could not refresh this run",
          }));
        }
      }
      if (!disposed) timer = setTimeout(() => void poll(), 3_000);
    };
    void poll();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
    };
  }, [activeRunId, activeRunStatus, streamStatus, trackRun]);

  useEffect(() => {
    if (!enabled || !requestId) return;
    let disposed = false;

    const start = async () => {
      setState({ ...initialState, starting: true });
      setWorkflowInstanceId(undefined);
      try {
        const request = {
          browserExecutionTarget: "extension",
          capability,
          context: extractPageContext(selectedText),
          executionLane: "short",
          input,
          options: targetLanguage ? { targetLanguage } : undefined,
        } as const;
        if (capability === "chat") {
          const result = await dispatchTask({
            ...request,
            selectionMode: "auto",
          });
          if (result.kind === "workflow") {
            if (!disposed) {
              setWorkflowInstanceId(result.id);
              setState(initialState);
            }
            return;
          }
          if (!disposed) await trackRun(result);
          return;
        }
        const run = await createAssistantRun(request);
        if (!disposed) await trackRun(run);
      } catch (error) {
        if (disposed) return;
        setState({
          ...initialState,
          error:
            error instanceof Error
              ? error.message
              : `Repin could not start the ${capability} request`,
          starting: false,
        });
      }
    };

    void start();
    return () => {
      disposed = true;
    };
  }, [
    attempt,
    capability,
    enabled,
    input,
    requestId,
    selectedText,
    targetLanguage,
    trackRun,
  ]);

  useEffect(() => {
    const runId = state.run?.id;
    const runStatus = state.run?.status;
    if (!runId || runStatus !== "awaiting_approval") return;
    let disposed = false;
    void getAssistantRunApprovals(runId)
      .then((approvals) => {
        if (!disposed) {
          setState((current) => ({
            ...current,
            approvalError: undefined,
            approvals,
          }));
        }
      })
      .catch((error) => {
        if (!disposed) {
          setState((current) => ({
            ...current,
            approvalError:
              error instanceof Error
                ? error.message
                : "Repin could not load this approval",
          }));
        }
      });
    return () => {
      disposed = true;
    };
  }, [state.run?.id, state.run?.status]);

  const sendMessage = useCallback(
    async (content: string) => {
      const conversationId = state.run?.conversationId;
      if (!conversationId) throw new Error("Conversation is not available");
      setState((current) => ({
        ...current,
        error: undefined,
        starting: true,
      }));
      try {
        await trackRun(
          await createAssistantConversationMessage(conversationId, content),
        );
      } catch (error) {
        setState((current) => ({
          ...current,
          error:
            error instanceof Error
              ? error.message
              : "Repin could not send this message",
          starting: false,
        }));
      }
    },
    [state.run?.conversationId, trackRun],
  );

  const cancel = useCallback(async () => {
    if (!state.run || TERMINAL_STATUSES.has(state.run.status)) return;
    setState((current) => ({ ...current, cancelling: true, error: undefined }));
    try {
      const run = await cancelAssistantRun(state.run.id);
      setState((current) => ({
        ...current,
        approvals: [],
        cancelling: false,
        run,
        starting: false,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        cancelling: false,
        error:
          error instanceof Error
            ? error.message
            : "Repin could not cancel this run",
      }));
    }
  }, [state.run]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  const decideApproval = useCallback(
    async (approvalId: string, decision: "approve" | "deny") => {
      const runId = state.run?.id;
      if (!runId) return;
      setState((current) => ({
        ...current,
        approvalError: undefined,
        decidingApproval: decision,
        decidingApprovalId: approvalId,
      }));
      try {
        const run = await (decision === "approve"
          ? approveAssistantRunAction(runId, approvalId)
          : denyAssistantRunAction(runId, approvalId));
        await trackRun(run);
      } catch (error) {
        setState((current) => ({
          ...current,
          approvalError:
            error instanceof Error
              ? error.message
              : "Repin could not record your decision",
          decidingApproval: undefined,
          decidingApprovalId: undefined,
        }));
      }
    },
    [state.run?.id, trackRun],
  );

  const resume = useCallback(async () => {
    if (state.run?.status !== "suspended") return;
    setState((current) => ({ ...current, error: undefined, resuming: true }));
    try {
      await trackRun(await resumeAssistantRun(state.run.id));
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : "Repin could not resume this run",
        resuming: false,
      }));
    }
  }, [state.run, trackRun]);

  return {
    ...state,
    approve: (approvalId: string) => decideApproval(approvalId, "approve"),
    cancel,
    deny: (approvalId: string) => decideApproval(approvalId, "deny"),
    resume,
    retry,
    sendMessage,
    workflowInstanceId,
  };
};
