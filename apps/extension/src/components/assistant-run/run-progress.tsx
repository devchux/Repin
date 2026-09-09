import { LoaderCircle } from "lucide-react";

export const RunProgress = ({
  statusLabel,
}: {
  readonly statusLabel: string;
}) => (
  <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
    <LoaderCircle
      aria-hidden="true"
      className="mt-0.5 size-5 shrink-0 animate-spin text-primary"
    />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium">{statusLabel}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
        You can close the sidebar. This run will remain available in Activity.
      </p>
    </div>
  </div>
);
