import type {
  AiAssistantCapability,
  AssistantRun,
} from "@repo/contracts/assistant";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  cancelAssistantRun,
  createAssistantConversationMessage,
  createAssistantRun,
  getAssistantRun,
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
  cancelling: boolean;
  error?: string;
  run?: AssistantRun;
  starting: boolean;
};

const initialState: AssistantRunState = {
  cancelling: false,
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
  const pollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pollGeneration = useRef(0);

  const trackRun = useCallback(async (acceptedRun: AssistantRun) => {
    const generation = ++pollGeneration.current;
    let pollFailures = 0;
    const updateRun = (run: AssistantRun) => {
      if (generation !== pollGeneration.current) return;
      setState({ cancelling: false, run, starting: false });
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
      setState({ cancelling: false, starting: true });
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
              setState({ cancelling: false, starting: false });
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
          cancelling: false,
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
      setState({ cancelling: false, run, starting: false });
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

  return {
    ...state,
    cancel,
    retry,
    sendMessage,
    workflowInstanceId,
  };
};
