"use client";

import { useFetch } from "@/hooks/useFetch";
import type {
  AiAssistantCapability,
  AssistantConversationsPage,
  AssistantRunsPage,
  AssistantRunStatus,
} from "@repo/contracts/assistant";

export function useAssistantConversations(params: {
  readonly search?: string;
  readonly capability?: AiAssistantCapability;
  readonly updatedAfter?: string;
  readonly sort?: "recent" | "created" | "oldest" | "messages";
  readonly page?: number;
  readonly limit?: number;
  readonly enabled?: boolean;
}) {
  return useFetch<AssistantConversationsPage>("/assistant/conversations", {
    enabled: params.enabled,
    hideToast: "all",
    params: {
      search: params.search || undefined,
      capability: params.capability,
      updatedAfter: params.updatedAfter,
      sort: params.sort,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
    queryKey: ["assistant", "conversations", params],
  });
}

export function useAssistantRuns(params: {
  readonly search?: string;
  readonly status?: readonly AssistantRunStatus[];
  readonly page?: number;
  readonly limit?: number;
  readonly enabled?: boolean;
  readonly refetchInterval?: number;
}) {
  return useFetch<AssistantRunsPage>("/assistant/runs", {
    enabled: params.enabled,
    hideToast: "all",
    params: {
      search: params.search || undefined,
      status: params.status,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
    queryKey: ["assistant", "runs", params],
    refetchInterval: params.refetchInterval,
  });
}
