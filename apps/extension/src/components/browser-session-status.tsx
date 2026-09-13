import { CircleAlert, LoaderCircle } from "lucide-react";

import { cn } from "@repo/ui/lib/utils";
import { useBrowserSessionStatus } from "../hooks/use-browser-session-status";

const copy = {
  connected: "Browser connected",
  connecting: "Connecting browser",
  disconnected: "Browser disconnected",
  error: "Browser connection unavailable",
  reconnecting: "Reconnecting browser",
} as const;

export const BrowserSessionStatusIndicator = ({
  className,
  showDetail = false,
}: {
  readonly className?: string;
  readonly showDetail?: boolean;
}) => {
  const status = useBrowserSessionStatus();
  const pending = ["connecting", "reconnecting"].includes(status.state);
  const problem = ["disconnected", "error"].includes(status.state);

  return (
    <div
      aria-live="polite"
      className={cn("flex min-w-0 items-center gap-2", className)}
      title={status.message}
    >
      {pending ? (
        <LoaderCircle className="size-3.5 shrink-0 animate-spin text-amber-500" />
      ) : status.state === "error" ? (
        <CircleAlert className="size-3.5 shrink-0 text-red-500" />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "size-2.5 shrink-0 rounded-full",
            problem ? "bg-neutral-400" : "bg-emerald-500",
          )}
        />
      )}
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium">
          {copy[status.state]}
        </span>
        {showDetail && status.message ? (
          <span className="block truncate text-[11px] text-neutral-500 dark:text-neutral-400">
            {status.message}
          </span>
        ) : null}
      </span>
    </div>
  );
};
