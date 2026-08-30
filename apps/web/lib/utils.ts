import { StatusPresentation } from "@/types/activity";
import { Theme, themes } from "@/types/appearance";
import { AssistantRun, AssistantRunStatus } from "@repo/contracts/assistant";
import { AlertCircle, CheckCircle2, LoaderCircle, XCircle } from "@repo/ui/icons";

export function formatRelativeDate(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)} days ago`;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}

export function getStatus(status: AssistantRunStatus): StatusPresentation {
  if (status === "completed")
    return {
      label: "Completed",
      icon: CheckCircle2,
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      spin: false,
    };
  if (status === "failed" || status === "cancelled")
    return {
      label: status === "failed" ? "Failed" : "Cancelled",
      icon: XCircle,
      className: "bg-destructive/10 text-destructive",
      spin: false,
    };
  if (status === "awaiting_approval" || status === "suspended")
    return {
      label: status === "awaiting_approval" ? "Approval needed" : "Suspended",
      icon: AlertCircle,
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      spin: false,
    };
  return {
    label: status === "queued" ? "Queued" : "Running",
    icon: LoaderCircle,
    className: "bg-primary/10 text-primary",
    spin: status === "running",
  };
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDuration(run: AssistantRun) {
  const start = new Date(run.startedAt ?? run.createdAt).getTime();
  const end = new Date(run.completedAt ?? run.updatedAt).getTime();
  const seconds = Math.max(0, Math.round((end - start) / 1_000));
  return seconds < 60
    ? `${seconds}s`
    : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function getHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Repin workspace";
  }
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getRunTitle(run: AssistantRun) {
  return (
    run.input?.trim() ||
    `${capitalize(run.capability)} ${getHost(run.context.url)}`
  );
}

export function isTheme(value: string | null): value is Theme {
  return themes.some((theme) => theme === value);
}

export function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle(
    "dark",
    theme === "dark" || (theme === "system" && prefersDark),
  );
  document.documentElement.style.colorScheme =
    theme === "system" ? "light dark" : theme;
}