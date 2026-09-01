import { CircleStop, LoaderCircle, RefreshCw } from "lucide-react";

import { Button } from "@repo/ui/button";
import { RichContent } from "@repo/ui/rich-content";

import { useSummarizePageRun } from "../hooks/use-assistant-run";

const statusCopy = {
  awaiting_approval: "Waiting for approval",
  cancelled: "Summary cancelled",
  completed: "Summary complete",
  failed: "Summary failed",
  queued: "Preparing summary",
  running: "Summarizing page",
  suspended: "Waiting for the browser",
} as const;

export const SummarizeRun = ({
  enabled,
  requestId,
}: {
  enabled: boolean;
  requestId: number;
}) => {
  const { cancel, cancelling, error, retry, run, starting } =
    useSummarizePageRun(enabled, requestId);
  const active =
    starting ||
    Boolean(
      run &&
        ["queued", "running", "awaiting_approval", "suspended"].includes(
          run.status,
        ),
    );
  const failure = error ?? run?.error;
  const retryable =
    !active && Boolean(failure || run?.status === "cancelled");

  return (
    <section className="flex flex-1 flex-col gap-4 p-4" aria-live="polite">
      {active ? (
        <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <LoaderCircle
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 animate-spin text-primary"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {run ? statusCopy[run.status] : "Reading page"}
            </p>
            <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
              You can close the sidebar. This run will remain available in
              Activity.
            </p>
          </div>
        </div>
      ) : null}

      {run?.result ? (
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Summary
          </h2>
          <RichContent className="mt-3" content={run.result} />
        </div>
      ) : null}

      {failure ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300">
          {failure}
        </div>
      ) : null}

      {!active && !run?.result && !failure && run ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {statusCopy[run.status]}
        </p>
      ) : null}

      {active || retryable ? (
        <div className="mt-auto flex justify-end gap-2 pt-2">
          {active && run ? (
            <Button
              disabled={cancelling}
              onClick={() => void cancel()}
              size="sm"
              variant="ghost"
            >
              {cancelling ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <CircleStop className="mr-2 size-4" />
              )}
              Cancel
            </Button>
          ) : null}
          {retryable ? (
            <Button onClick={retry} size="sm">
              <RefreshCw className="mr-2 size-4" />
              Try again
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
