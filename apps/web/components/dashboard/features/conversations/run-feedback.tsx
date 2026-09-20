import type { AssistantRun, BrowserActionApproval } from "@repo/contracts/assistant";
import { Button } from "@repo/ui/button";
import { AlertCircle, Check, LoaderCircle, Wifi, XCircle } from "@repo/ui/icons";

const phaseLabels: Record<AssistantRun["phase"], string> = {
  queued: "Waiting to start",
  initializing: "Preparing context",
  reasoning: "Thinking",
  executing: "Using browser tools",
  awaiting_approval: "Waiting for your approval",
  suspended: "Browser connection paused",
  finalizing: "Preparing the response",
  terminal: "Finished",
};

export function RunFeedback({
  approval,
  approving,
  denying,
  onApprove,
  onDeny,
  onResume,
  onRetry,
  resuming,
  run,
}: {
  readonly approval?: BrowserActionApproval;
  readonly approving?: boolean;
  readonly denying?: boolean;
  readonly onApprove?: () => void;
  readonly onDeny?: () => void;
  readonly onResume?: () => void;
  readonly onRetry?: () => void;
  readonly resuming?: boolean;
  readonly run: AssistantRun;
}) {
  if (run.status === "completed") return null;

  if (approval) {
    return (
      <section className="max-w-3xl rounded-xl border border-primary/25 bg-primary/5 p-4" aria-live="polite">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Browser action needs approval</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{approval.reason}</p>
            <p className="mt-2 break-words text-xs text-muted-foreground">Action: {approval.toolName.replaceAll("_", " ")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" disabled={approving || denying} onClick={onApprove}>
                {approving ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
                Approve
              </Button>
              <Button size="sm" variant="outline" disabled={approving || denying} onClick={onDeny}>
                Deny
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (run.status === "failed" || run.status === "cancelled") {
    return (
      <section className="max-w-3xl rounded-xl border border-destructive/25 bg-destructive/5 p-4" aria-live="polite">
        <div className="flex gap-3">
          <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{run.status === "cancelled" ? "Response stopped" : "Repin could not finish this response"}</p>
            {run.error ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{run.error}</p> : null}
            {onRetry ? <Button className="mt-3" size="sm" variant="outline" onClick={onRetry}>Try again</Button> : null}
          </div>
        </div>
      </section>
    );
  }

  if (run.status === "suspended") {
    return (
      <section className="max-w-3xl rounded-xl border p-4" aria-live="polite">
        <div className="flex gap-3">
          <Wifi className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">Browser connection paused</p>
            <p className="mt-1 text-sm text-muted-foreground">Reconnect the extension, then resume this run.</p>
            {onResume ? <Button className="mt-3" size="sm" variant="outline" disabled={resuming} onClick={onResume}>{resuming ? "Resuming..." : "Resume"}</Button> : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="flex max-w-3xl items-center gap-2 py-1 text-sm text-muted-foreground" aria-live="polite">
      <LoaderCircle className="size-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
      <span>{phaseLabels[run.phase]}</span>
      {run.execution.toolCalls > 0 ? <span className="text-xs">({run.execution.toolCalls} tool {run.execution.toolCalls === 1 ? "call" : "calls"})</span> : null}
    </div>
  );
}
