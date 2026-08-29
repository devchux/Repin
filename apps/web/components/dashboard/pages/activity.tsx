"use client";

import type { AssistantRun } from "@repo/contracts/assistant";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Search } from "@repo/ui/icons";
import { useMemo, useState } from "react";

import { useFetch } from "@/hooks/useFetch";
import { ActivityMetric } from "../features/activity/metric";
import { ActivityRow } from "../features/activity/row";
import { ActivitySkeleton } from "../features/activity/skeleton";
import { EmptyState } from "../features/common/empty-state";

type ActivityFilter = "all" | "in-progress" | "completed" | "failed";

const filters: readonly { label: string; value: ActivityFilter }[] = [
  { label: "All", value: "all" },
  { label: "In progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
  { label: "Needs attention", value: "failed" },
];

export function ActivityPage() {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [query, setQuery] = useState("");
  const runs = useFetch<readonly AssistantRun[]>("/assistant/runs", {
    hideToast: "all",
    refetchInterval: 5_000,
  });
  const items = useMemo(() => {
    const search = query.trim().toLowerCase();
    return (runs.data?.data.data ?? []).filter((run) => {
      const matchesQuery =
        !search ||
        `${run.input ?? ""} ${run.context.title} ${run.context.url} ${run.capability}`
          .toLowerCase()
          .includes(search);
      const matchesFilter =
        filter === "all" ||
        (filter === "completed" && run.status === "completed") ||
        (filter === "failed" &&
          ["failed", "cancelled", "awaiting_approval", "suspended"].includes(
            run.status,
          )) ||
        (filter === "in-progress" &&
          ["queued", "running"].includes(run.status));
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, runs.data]);

  return (
    <main className="mx-auto w-full max-w-5xl p-4 md:p-6 lg:p-8">
      <section>
        <p className="text-sm font-medium text-primary">Workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
          Activity
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Follow assistant runs and browser work from both the web app and
          extension.
        </p>
      </section>

      <section
        className="mt-7 grid gap-3 sm:grid-cols-3"
        aria-label="Activity summary"
      >
        <ActivityMetric
          label="Total runs"
          value={runs.data?.data.data.length ?? 0}
          detail="Latest 100"
        />
        <ActivityMetric
          label="Completed"
          value={
            (runs.data?.data.data ?? []).filter(
              (run) => run.status === "completed",
            ).length
          }
          detail="Finished successfully"
        />
        <ActivityMetric
          label="Needs attention"
          value={
            (runs.data?.data.data ?? []).filter((run) =>
              ["failed", "awaiting_approval", "suspended"].includes(run.status),
            ).length
          }
          detail="Review or resume"
        />
      </section>

      <div className="mt-7 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div
          className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1"
          aria-label="Filter activity"
        >
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${filter === item.value ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Search activity"
            className="pl-9"
            placeholder="Search activity"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <section
        className="mt-5 overflow-hidden rounded-xl border bg-background"
        aria-label="Assistant activity"
      >
        {runs.isLoading ? <ActivitySkeleton /> : null}
        {runs.isError ? (
          <EmptyState
            title="Activity could not be loaded"
            description="Check your connection and try again."
            action={
              <Button onClick={() => void runs.refetch()}>Try again</Button>
            }
          />
        ) : null}
        {!runs.isLoading && !runs.isError && items.length === 0 ? (
          <EmptyState
            title={
              query || filter !== "all"
                ? "No matching activity"
                : "No activity yet"
            }
            description={
              query || filter !== "all"
                ? "Adjust the search or filter to see more results."
                : "Assistant and browser runs will appear here as you use Repin."
            }
          />
        ) : null}
        {items.map((run) => (
          <ActivityRow key={run.id} run={run} />
        ))}
      </section>
    </main>
  );
}
