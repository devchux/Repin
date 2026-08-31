"use client";

import type { AssistantRun } from "@repo/contracts/assistant";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Search } from "@repo/ui/icons";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { useMemo, useState } from "react";

import { useFetch } from "@/hooks/useFetch";
import { ActivityMetric } from "../features/activity/metric";
import { ActivityRow } from "../features/activity/row";
import { ActivitySkeleton } from "../features/activity/skeleton";
import { EmptyState } from "../features/common/empty-state";
import { PageHeading } from "../features/common/page-heading";
import { WorkspacePage } from "../layout/workspace-page";
import { ActivityFilter } from "@/types/activity";

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
    <WorkspacePage>
      <PageHeading
        eyebrow="Workspace"
        title="Activity"
        description="Follow assistant runs and browser work from both the web app and extension."
      />

      <section
        className="mt-8 grid overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_oklch(0_0_0/0.025)] sm:grid-cols-3"
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
          bordered
        />
        <ActivityMetric
          label="Needs attention"
          value={
            (runs.data?.data.data ?? []).filter((run) =>
              ["failed", "awaiting_approval", "suspended"].includes(run.status),
            ).length
          }
          detail="Review or resume"
          bordered
        />
      </section>

      <section
        className="mt-7 overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_oklch(0_0_0/0.025)]"
        aria-label="Assistant activity"
      >
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <Tabs
            value={filter}
            onValueChange={(value) => setFilter(value as ActivityFilter)}
          >
            <TabsList
              className="h-auto max-w-full justify-start overflow-x-auto bg-muted/70"
              aria-label="Filter activity"
            >
              {filters.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="flex-none px-3 py-1.5"
                >
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative w-full md:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              aria-label="Search activity"
              className="bg-muted/25 pl-9 shadow-none"
              placeholder="Search activity"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <div className="border-t">
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
        </div>
      </section>
    </WorkspacePage>
  );
}
