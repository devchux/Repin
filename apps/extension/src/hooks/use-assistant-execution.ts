import type {
  AiAssistantCapability,
  AssistantRun,
  BrowserActionApproval,
} from "@repo/contracts/assistant";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const pollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const pollGeneration = useRef(0);

  const trackRun = useCallback(async (acceptedRun: AssistantRun) => {
    const generation = ++pollGeneration.current;
    let pollFailures = 0;
    const updateRun = (run: AssistantRun) => {
      if (generation !== pollGeneration.current) return;
      setState((current) => ({
        ...current,
        approvalError: undefined,
        approvals: run.status === "awaiting_approval" ? current.approvals : [],
        cancelling: false,
        decidingApproval: undefined,
        decidingApprovalId: undefined,
        resuming: false,
        run,
        starting: false,
      }));
    };
    const poll = async (runId: string) => {
      try {
        const run = await getAssistantRun(runId);
        pollFailures = 0;
        updateRun(run);
        if (!TERMINAL_STATUSES.has(run.status)) {
          pollTimer.current = setTimeout(() => void poll(runId), 1_500);
        }
      } catch (error) {
        pollFailures += 1;
        if (generation !== pollGeneration.current) return;
        if (pollFailures < MAX_POLL_FAILURES) {
          pollTimer.current = setTimeout(
            () => void poll(runId),
            pollFailures * 1_500,
          );
          return;
        }
        setState((current) => ({
          ...current,
          error:
            error instanceof Error
              ? error.message
              : "Repin could not refresh this run",
          starting: false,
        }));
      }
    };

    updateRun(acceptedRun);
    if (!TERMINAL_STATUSES.has(acceptedRun.status)) void poll(acceptedRun.id);
  }, []);

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
      pollGeneration.current += 1;
      if (pollTimer.current) clearTimeout(pollTimer.current);
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
