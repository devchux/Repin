"use client";

import type { AssistantRun } from "@repo/contracts/assistant";
import { Button } from "@repo/ui/button";
import {
  ArrowRight,
  ExternalLink,
  MessageSquareText,
} from "@repo/ui/icons";
import { Skeleton } from "@repo/ui/skeleton";
import Link from "next/link";

import { useFetch } from "@/hooks/useFetch";
import {
  formatDate,
  formatDuration,
  getRunTitle,
  getStatus,
} from "@/lib/utils";
import { ActivityDetailMetric } from "../features/activity/detail-metric";

export function ActivityDetailPage({ runId }: { runId: string }) {
  const request = useFetch<AssistantRun>(`/assistant/runs/${runId}`, {
    hideToast: "all",
    refetchInterval: (query) =>
      ["queued", "running"].includes(query.state.data?.data.data.status ?? "")
        ? 2_000
        : false,
  });
  const run = request.data?.data.data;

  if (request.isLoading)
    return (
      <main className="mx-auto w-full max-w-4xl p-4 md:p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-8 h-64 rounded-xl" />
      </main>
    );
  if (request.isError || !run)
    return (
      <main className="m-auto p-8 text-center">
        <h1 className="font-semibold">Run details could not be loaded</h1>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => void request.refetch()}
        >
          Try again
        </Button>
      </main>
    );

  const status = getStatus(run.status);
  return (
    <main className="mx-auto w-full max-w-4xl p-4 md:p-6 lg:p-8">
      <Link
        href="/activity"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to activity
      </Link>
      <section className="mt-5 flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${status.className}`}
            >
              <status.icon
                className={`size-4 ${status.spin ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
            </span>
            <span className="text-sm font-medium">{status.label}</span>
          </div>
          <h1 className="mt-4 max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">
            {getRunTitle(run)}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Started {formatDate(run.createdAt)}
          </p>
        </div>
        {run.conversationId ? (
          <Button asChild variant="outline" className="w-fit">
            <Link href={`/conversations/${run.conversationId}`}>
              Open conversation <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
      </section>

      <section
        className="grid gap-3 py-6 sm:grid-cols-3"
        aria-label="Run summary"
      >
        <ActivityDetailMetric
          icon="timer"
          label="Duration"
          value={formatDuration(run)}
        />
        <ActivityDetailMetric
          icon="bot"
          label="Model calls"
          value={`${run.execution.modelCalls} of ${run.execution.maxModelCalls}`}
        />
        <ActivityDetailMetric
          icon="zap"
          label="Tool calls"
          value={`${run.execution.toolCalls} of ${run.execution.maxToolCalls}`}
        />
      </section>

      <section className="space-y-6">
        <div className="rounded-xl border bg-background p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Source context
          </p>
          <h2 className="mt-3 font-semibold">{run.context.title}</h2>
          <a
            href={run.context.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-sm text-primary hover:underline"
          >
            {run.context.url}
            <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
          </a>
        </div>
        {run.input ? (
          <div>
            <h2 className="text-sm font-semibold">Request</h2>
            <div className="mt-3 rounded-xl bg-muted/50 p-4 text-sm leading-6">
              {run.input}
            </div>
          </div>
        ) : null}
        {run.result ? (
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquareText
                className="size-4 text-primary"
                aria-hidden="true"
              />{" "}
              Result
            </h2>
            <div className="mt-3 whitespace-pre-wrap rounded-xl border bg-background p-5 text-sm leading-7">
              {run.result}
            </div>
          </div>
        ) : null}
        {run.error ? (
          <div>
            <h2 className="text-sm font-semibold text-destructive">Error</h2>
            <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm leading-6 text-destructive">
              {run.error}
            </div>
          </div>
        ) : null}
        {!run.result && !run.error ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm font-medium">{status.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This page refreshes automatically while the run progresses.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
