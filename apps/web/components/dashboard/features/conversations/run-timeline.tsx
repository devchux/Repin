"use client";

import type {
  AssistantRunStatus,
  AssistantRunTimelineEvent,
  AssistantRunTimelinePage,
} from "@repo/contracts/assistant";
import { Check, ChevronDown, LoaderCircle, XCircle } from "@repo/ui/icons";

import { useFetch } from "@/hooks/useFetch";

type EventDetail = Readonly<Record<string, unknown>>;

const isVisible = (event: AssistantRunTimelineEvent) =>
  event.type !== "assistant.delta" &&
  !["run.completed", "run.failed", "run.cancelled"].includes(event.type);

function eventLabel(event: AssistantRunTimelineEvent) {
  const detail = event.data;
  const stepDetail = detail.detail;
  const input =
    stepDetail && typeof stepDetail === "object"
      ? (stepDetail as EventDetail)
      : undefined;
  const toolName =
    typeof detail.toolName === "string"
      ? detail.toolName
      : typeof input?.name === "string"
        ? input.name
        : undefined;
  if (event.type === "run.started") return "Run started";
  if (event.type === "agent.reasoning") return "Reasoning";
  if (event.type === "agent.executing") return toolName ? `Using ${humanize(toolName)}` : "Using a tool";
  if (event.type === "step.started" && detail.stepType === "tool") {
    return toolName ? `Started ${humanize(toolName)}` : "Tool call started";
  }
  if (event.type === "step.started" && detail.stepType === "verification") return "Verifying browser action";
  if (event.type === "step.completed") return `${humanize(String(detail.stepType ?? "step"))} completed`;
  if (event.type === "step.failed") return `${humanize(String(detail.stepType ?? "step"))} failed`;
  if (event.type === "approval.requested") return "Approval requested";
  if (event.type === "approval.approved") return "Action approved";
  if (event.type === "approval.denied") return "Action denied";
  if (event.type === "browser.suspended") return "Browser connection paused";
  if (event.type === "browser.resume_requested") return "Browser reconnect requested";
  if (event.type === "run.retry_scheduled") return "Retry scheduled";
  return humanize(event.type);
}

function humanize(value: string) {
  const normalized = value.replaceAll("_", " ").replaceAll(".", " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function mergeEvents(
  historical: readonly AssistantRunTimelineEvent[],
  live: readonly AssistantRunTimelineEvent[],
) {
  const bySequence = new Map<number, AssistantRunTimelineEvent>();
  for (const event of [...historical, ...live]) bySequence.set(event.sequence, event);
  return [...bySequence.values()].sort((left, right) => left.sequence - right.sequence);
}

export function RunTimeline({
  liveEvents,
  runId,
  runStatus,
}: {
  readonly liveEvents: readonly AssistantRunTimelineEvent[];
  readonly runId: string;
  readonly runStatus: AssistantRunStatus;
}) {
  const terminal = ["completed", "failed", "cancelled"].includes(runStatus);
  const timeline = useFetch<AssistantRunTimelinePage>(
    `/assistant/runs/${runId}/timeline`,
    {
      hideToast: "all",
      params: { limit: 100, page: 1 },
      refetchInterval: terminal ? false : 2_000,
    },
  );
  const events = mergeEvents(timeline.data?.data.data.items ?? [], liveEvents).filter(isVisible);
  if (!timeline.isLoading && events.length === 0) return null;

  return (
    <details className="group max-w-3xl rounded-xl border bg-muted/20 text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-muted-foreground marker:hidden">
        <span className="flex items-center gap-2">
          {timeline.isLoading ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          Run activity
          {events.length ? <span className="text-xs">{events.length} updates</span> : null}
        </span>
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      {events.length ? (
        <ol className="border-t px-3 py-2">
          {events.map((event) => {
            const failed = event.type.includes("failed") || event.type.includes("denied");
            const active =
              !terminal &&
              event === events.at(-1) &&
              !event.type.includes("completed");
            return (
              <li className="flex gap-2.5 py-1.5" key={`${event.sequence}:${event.type}`}>
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-muted-foreground">
                  {failed ? (
                    <XCircle className="size-4 text-destructive" aria-hidden="true" />
                  ) : active ? (
                    <LoaderCircle className="size-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
                  ) : (
                    <Check className="size-3.5" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground">{eventLabel(event)}</p>
                  {event.type === "step.started" && event.data.detail ? (
                    <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap wrap-break-word rounded-lg bg-muted px-2.5 py-2 text-xs leading-5 text-muted-foreground">
                      {JSON.stringify(event.data.detail, null, 2)}
                    </pre>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
    </details>
  );
}
