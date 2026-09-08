import { useCallback, useEffect, useState } from "react";
import type { WorkflowInstance } from "@repo/contracts/workflow";

import {
  cancelWorkflowInstance,
  getWorkflowInstance,
} from "../assistant/workflow-client";

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
        if (!TERMINAL_STATUSES.has(next.status)) {
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
  }, [instanceId]);

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

  return { cancel, cancelling, error, instance };
};
