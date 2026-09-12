import { useCallback, useEffect, useState } from "react";
import type { WorkflowInstance } from "@repo/contracts/workflow";
import type {
  AssistantRun,
  BrowserActionApproval,
} from "@repo/contracts/assistant";

import {
  cancelWorkflowInstance,
  getWorkflowInstance,
} from "../assistant/workflow-client";
import {
  approveAssistantRunAction,
  denyAssistantRunAction,
  getAssistantRun,
  getAssistantRunApprovals,
  resumeAssistantRun,
} from "../assistant/assistant-run-client";
import { useEventStream } from "./use-event-stream";

const TERMINAL_STATUSES = new Set<WorkflowInstance["status"]>([
  "cancelled",
  "completed",
  "failed",
]);
const POLL_INTERVAL_MS = 1_500;

export const useWorkflowInstance = (instanceId?: string) => {
  const [instance, setInstance] = useState<WorkflowInstance>();
  const [error, setError] = useState<string>();
  const [cancelling, setCancelling] = useState(false);
  const [activeRun, setActiveRun] = useState<AssistantRun>();
  const [approvals, setApprovals] = useState<readonly BrowserActionApproval[]>(
    [],
  );
  const [interventionError, setInterventionError] = useState<string>();
  const [decision, setDecision] = useState<"approve" | "deny">();
  const [resuming, setResuming] = useState(false);
  const [streamRevision, setStreamRevision] = useState(0);
  const streamStatus = useEventStream(
    "workflow-instance",
    instanceId,
    (event) => {
      if (event.type !== "heartbeat") setStreamRevision((value) => value + 1);
    },
  );

  useEffect(() => {
    if (!instanceId) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const next = await getWorkflowInstance(instanceId);
        if (disposed) return;
        setInstance(next);
        setError(undefined);
        const execution = next.nodeExecutions.find(
          (candidate) =>
            candidate.nodeId === next.currentNodeId && candidate.runId,
        );
        if (execution?.runId) {
          const run = await getAssistantRun(execution.runId);
          if (disposed) return;
          setActiveRun(run);
          if (run.status === "awaiting_approval") {
            try {
              const pending = await getAssistantRunApprovals(run.id);
              if (disposed) return;
              setApprovals(pending);
              setInterventionError(
                pending.length
                  ? undefined
                  : "This approval expired or is no longer available.",
              );
            } catch (approvalError) {
              if (disposed) return;
              setApprovals([]);
              setInterventionError(
                approvalError instanceof Error
                  ? approvalError.message
                  : "Repin could not load this approval",
              );
            }
          } else {
            setApprovals([]);
            setInterventionError(undefined);
          }
        } else {
          setActiveRun(undefined);
          setApprovals([]);
        }
        if (
          !TERMINAL_STATUSES.has(next.status) &&
          streamStatus !== "connected"
        ) {
          timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
        }
      } catch (pollError) {
        if (disposed) return;
        setError(
          pollError instanceof Error
            ? pollError.message
            : "Repin could not refresh this workflow",
        );
        timer = setTimeout(() => void poll(), POLL_INTERVAL_MS * 2);
      }
    };

    void poll();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
    };
  }, [instanceId, streamRevision, streamStatus]);

  const cancel = useCallback(async () => {
    if (!instanceId || cancelling) return;
    setCancelling(true);
    try {
      setInstance(await cancelWorkflowInstance(instanceId));
      setError(undefined);
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Repin could not cancel this workflow",
      );
    } finally {
      setCancelling(false);
    }
  }, [cancelling, instanceId]);

  const decide = useCallback(
    async (approvalId: string, nextDecision: "approve" | "deny") => {
      if (!activeRun) return;
      setDecision(nextDecision);
      setInterventionError(undefined);
      try {
        const run = await (nextDecision === "approve"
          ? approveAssistantRunAction(activeRun.id, approvalId)
          : denyAssistantRunAction(activeRun.id, approvalId));
        setActiveRun(run);
        setApprovals([]);
      } catch (decisionError) {
        setInterventionError(
          decisionError instanceof Error
            ? decisionError.message
            : "Repin could not record your decision",
        );
      } finally {
        setDecision(undefined);
      }
    },
    [activeRun],
  );

  const resume = useCallback(async () => {
    if (activeRun?.status !== "suspended") return;
    setResuming(true);
    setInterventionError(undefined);
    try {
      setActiveRun(await resumeAssistantRun(activeRun.id));
    } catch (resumeError) {
      setInterventionError(
        resumeError instanceof Error
          ? resumeError.message
          : "Repin could not resume this run",
      );
    } finally {
      setResuming(false);
    }
  }, [activeRun]);

  return {
    activeRun,
    approvals,
    approve: (approvalId: string) => decide(approvalId, "approve"),
    cancel,
    cancelling,
    decision,
    deny: (approvalId: string) => decide(approvalId, "deny"),
    error,
    instance,
    interventionError,
    resume,
    resuming,
  };
};
