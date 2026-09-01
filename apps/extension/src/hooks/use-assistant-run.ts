import type { AssistantRun } from "@repo/contracts/assistant";
import { useCallback, useEffect, useState } from "react";

import {
  cancelAssistantRun,
  createAssistantRun,
  getAssistantRun,
} from "../assistant/assistant-run-client";
import { extractPageContext } from "../lib/page-context";

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

export const useSummarizePageRun = (enabled: boolean, requestId: number) => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<AssistantRunState>(initialState);

  useEffect(() => {
    if (!enabled || requestId === 0) return;
    let disposed = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let pollFailures = 0;

    const updateRun = (run: AssistantRun) => {
      if (disposed) return;
      setState({ cancelling: false, run, starting: false });
    };

    const poll = async (runId: string) => {
      try {
        const run = await getAssistantRun(runId);
        pollFailures = 0;
        updateRun(run);
        if (!TERMINAL_STATUSES.has(run.status)) {
          pollTimer = setTimeout(() => void poll(runId), 1_500);
        }
      } catch (error) {
        pollFailures += 1;
        if (disposed) return;
        if (pollFailures < MAX_POLL_FAILURES) {
          pollTimer = setTimeout(
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

    const start = async () => {
      setState({ cancelling: false, starting: true });
      try {
        const run = await createAssistantRun({
          browserExecutionTarget: "extension",
          capability: "summarize",
          context: extractPageContext(),
          executionLane: "short",
        });
        updateRun(run);
        if (!TERMINAL_STATUSES.has(run.status)) void poll(run.id);
      } catch (error) {
        if (disposed) return;
        setState({
          cancelling: false,
          error:
            error instanceof Error
              ? error.message
              : "Repin could not start the summary",
          starting: false,
        });
      }
    };

    void start();
    return () => {
      disposed = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [attempt, enabled, requestId]);

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

  return { ...state, cancel, retry };
};
