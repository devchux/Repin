import type { AssistantRun } from "@repo/contracts/assistant";
import { ChevronRight } from "@repo/ui/icons";
import Link from "next/link";

import {
  formatDate,
  formatDuration,
  getHost,
  getRunTitle,
  getStatus,
} from "@/lib/utils";

export function ActivityRow({ run }: { run: AssistantRun }) {
  const status = getStatus(run.status);

  return (
    <Link
      href={`/activity/${run.id}`}
      className="group grid gap-3 border-b px-4 py-5 transition-colors last:border-b-0 hover:bg-muted/35 active:bg-muted sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center md:px-5"
    >
      <span
        className={`flex size-9 items-center justify-center rounded-xl ${status.className}`}
      >
        <status.icon
          className={`size-4 ${status.spin ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="max-w-full truncate text-sm font-semibold tracking-tight group-hover:text-primary">
            {getRunTitle(run)}
          </h2>
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
            {run.capability}
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {run.context.title || getHost(run.context.url)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{status.label}</span>
          <span>{formatDate(run.createdAt)}</span>
          <span>{formatDuration(run)}</span>
        </div>
      </div>
      <ChevronRight
        className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block"
        aria-hidden="true"
      />
    </Link>
  );
}
