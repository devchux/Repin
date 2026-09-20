"use client";

import type { AssistantRunStatus } from "@repo/contracts/assistant";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Search } from "@repo/ui/icons";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { useDeferredValue, useState } from "react";

import { useAssistantRuns } from "@/hooks/useAssistant";
import { ActivityMetric } from "../features/activity/metric";
import { ActivityRow } from "../features/activity/row";
import { ActivitySkeleton } from "../features/activity/skeleton";
import { EmptyState } from "../features/common/empty-state";
import { PageHeading } from "../features/common/page-heading";
import { PaginationControls } from "../features/common/pagination-controls";
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
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query.trim());
  const statuses = getStatuses(filter);
  const runs = useAssistantRuns({
    search: deferredQuery,
    status: statuses,
    page,
    limit: 20,
    refetchInterval: 5_000,
  });
  const totals = useAssistantRuns({ limit: 1, refetchInterval: 30_000 });
  const completed = useAssistantRuns({ status: ["completed"], limit: 1, refetchInterval: 30_000 });
  const attention = useAssistantRuns({ status: ["failed", "awaiting_approval", "suspended"], limit: 1, refetchInterval: 30_000 });
  const result = runs.data?.data.data;
  const items = result?.items ?? [];

  return (
    <WorkspacePage>
      <PageHeading
        eyebrow="Workspace"
        title="Activity"
        description="Follow AI runs and browser actions from both the web app and extension."
      />

      <section
        className="mt-8 grid overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_oklch(0_0_0/0.025)] sm:grid-cols-3"
        aria-label="Activity summary"
      >
        <ActivityMetric
          label="Total runs"
          value={totals.data?.data.data.total ?? 0}
          detail="All recorded runs"
        />
        <ActivityMetric
          label="Completed"
          value={completed.data?.data.data.total ?? 0}
          detail="Finished successfully"
          bordered
        />
        <ActivityMetric
          label="Needs attention"
          value={attention.data?.data.data.total ?? 0}
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
            onValueChange={(value) => {
              setFilter(value as ActivityFilter);
              setPage(1);
            }}
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
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
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
                  : "AI runs and browser actions will appear here as you use Repin."
              }
            />
          ) : null}
          {items.map((run) => (
            <ActivityRow key={run.id} run={run} />
          ))}
        </div>
        {result && result.pageCount > 1 ? (
          <div className="border-t px-4 py-3 md:px-5">
            <PaginationControls page={result.page} pageCount={result.pageCount} onPageChange={setPage} />
          </div>
        ) : null}
      </section>
    </WorkspacePage>
  );
}

function getStatuses(filter: ActivityFilter): readonly AssistantRunStatus[] | undefined {
  if (filter === "completed") return ["completed"];
  if (filter === "failed") return ["failed", "cancelled", "awaiting_approval", "suspended"];
  if (filter === "in-progress") return ["queued", "running"];
  return undefined;
}
