import type {
  AssistantRun,
  AssistantRunStatus,
} from "@repo/contracts/assistant";

const ACTIVE_RUN_STATUSES: readonly AssistantRunStatus[] = [
  "queued",
  "running",
  "awaiting_approval",
  "suspended",
];

export interface AssistantRunStatusCopy {
  readonly cancelled: string;
  readonly completed: string;
  readonly failed: string;
  readonly preparing: string;
  readonly resultTitle: string;
  readonly runningPage: string;
  readonly runningSelection: string;
}

export const getRunStatusLabel = (
  status: AssistantRunStatus | undefined,
  usesSelection: boolean,
  copy: AssistantRunStatusCopy,
): string => {
  switch (status) {
    case undefined:
      return usesSelection ? "Reading selection" : "Reading page";
    case "queued":
      return copy.preparing;
    case "running":
      return usesSelection ? copy.runningSelection : copy.runningPage;
    case "awaiting_approval":
    case "suspended":
      return "Waiting for the browser";
    case "cancelled":
      return copy.cancelled;
    case "completed":
      return copy.completed;
    case "failed":
      return copy.failed;
  }
};

export const isAssistantRunActive = (
  run: AssistantRun | undefined,
  starting: boolean,
) => starting || (run ? ACTIVE_RUN_STATUSES.includes(run.status) : false);
