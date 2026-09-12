import { Button } from "@repo/ui/button";
import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";

export const ResumePanel = ({
  error,
  onResume,
  resuming,
}: {
  readonly error?: string;
  readonly onResume: () => void;
  readonly resuming: boolean;
}) => (
  <section className="flex flex-1 flex-col p-4" aria-live="polite">
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <span className="flex size-9 items-center justify-center rounded-full bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
        <RefreshCw className="size-4" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-sm font-semibold">Ready to continue</h2>
      <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
        The browser connection was interrupted. Repin saved its place and can
        continue from the last safe checkpoint.
      </p>
      {error && (
        <p className="mt-3 flex gap-2 rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-700 dark:bg-red-950/30 dark:text-red-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      <Button
        className="mt-4 w-full"
        disabled={resuming}
        onClick={onResume}
        size="sm"
      >
        {resuming ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4" />
        )}
        {resuming ? "Resuming…" : "Resume run"}
      </Button>
    </div>
  </section>
);
