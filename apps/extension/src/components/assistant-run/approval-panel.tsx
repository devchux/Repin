import type { BrowserActionApproval } from "@repo/contracts/assistant";
import { Button } from "@repo/ui/button";
import {
  AlertTriangle,
  Check,
  LoaderCircle,
  ShieldCheck,
  X,
} from "lucide-react";

const TOOL_LABELS: Readonly<Record<string, string>> = {
  browser_close_tab: "Close a browser tab",
  browser_close_window: "Close a browser window",
  browser_download: "Download a file",
  browser_execute_script: "Run a script on this page",
  browser_paste: "Paste into this page",
  browser_set_permission: "Change a browser permission",
  browser_submit_form: "Submit a form",
  browser_upload_files: "Upload files",
};

const labelFor = (value: string) =>
  value
    .replace(/^browser_/, "")
    .split("_")
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ");

const displayValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
};

export const ApprovalPanel = ({
  approval,
  decision,
  error,
  onApprove,
  onDeny,
}: {
  readonly approval?: BrowserActionApproval;
  readonly decision?: "approve" | "deny";
  readonly error?: string;
  readonly onApprove: () => void;
  readonly onDeny: () => void;
}) => (
  <section className="flex flex-1 flex-col p-4" aria-live="polite">
    <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm dark:border-amber-900/70 dark:bg-neutral-900">
      <div className="flex items-start gap-3 bg-amber-50 p-4 dark:bg-amber-950/30">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Your approval is required</p>
          <p className="mt-1 text-xs leading-5 text-neutral-600 dark:text-neutral-300">
            Repin paused before taking an action that can affect this page.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {approval ? (
          <>
            <div>
              <p className="text-sm font-medium">
                {TOOL_LABELS[approval.toolName] ?? labelFor(approval.toolName)}
              </p>
              <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
                {approval.reason}
              </p>
            </div>
            {Object.keys(approval.arguments).length > 0 && (
              <dl className="space-y-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950">
                {Object.entries(approval.arguments).map(([key, value]) => (
                  <div
                    className="grid grid-cols-[7rem_1fr] gap-2 text-xs"
                    key={key}
                  >
                    <dt className="truncate text-neutral-500 dark:text-neutral-400">
                      {labelFor(key)}
                    </dt>
                    <dd className="wrap-break-word text-neutral-800 dark:text-neutral-200">
                      {displayValue(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </>
        ) : !error ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <LoaderCircle className="size-4 animate-spin" />
            Loading action details
          </div>
        ) : null}

        {error && (
          <div className="flex gap-2 rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-700 dark:bg-red-950/30 dark:text-red-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-neutral-100 p-3 dark:border-neutral-800">
        <Button
          disabled={!approval || Boolean(decision)}
          onClick={onDeny}
          size="sm"
          variant="ghost"
        >
          {decision === "deny" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <X className="size-4" />
          )}
          {decision === "deny" ? "Denying…" : "Deny"}
        </Button>
        <Button
          disabled={!approval || Boolean(decision)}
          onClick={onApprove}
          size="sm"
        >
          {decision === "approve" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          {decision === "approve" ? "Allowing…" : "Allow once"}
        </Button>
      </div>
    </div>
    <p className="mt-3 px-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
      Approval applies only to this exact action. Changed actions require a new
      approval.
    </p>
  </section>
);
