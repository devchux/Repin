"use client";

import { useFetch } from "@/hooks/useFetch";
import { useSend } from "@/hooks/useSend";
import { useQueryClient } from "@repo/client/query";
import type {
  HighlightColor,
  HighlightsPage,
  SavedHighlight,
  UpdateHighlightRequest,
} from "@repo/contracts/highlight";

export const highlightQueryKeys = {
  all: ["highlights"] as const,
  detail: (id: string) => ["highlights", id] as const,
};

export function useHighlights(params: {
  readonly search?: string;
  readonly color?: HighlightColor;
  readonly page?: number;
  readonly limit?: number;
}) {
  return useFetch<HighlightsPage>("/highlights", {
    hideToast: "all",
    params: {
      search: params.search || undefined,
      color: params.color,
      page: params.page ?? 1,
      limit: params.limit ?? 100,
    },
    queryKey: [...highlightQueryKeys.all, params],
  });
}

export function useHighlight(id: string) {
  return useFetch<SavedHighlight>(`/highlights/${id}`, {
    enabled: Boolean(id),
    hideToast: "all",
    queryKey: highlightQueryKeys.detail(id),
  });
}

export function useUpdateHighlight(
  id: string,
  onUpdated?: (highlight: SavedHighlight) => void,
) {
  const queryClient = useQueryClient();
  return useSend<UpdateHighlightRequest, SavedHighlight>(`/highlights/${id}`, {
    method: "patch",
    hideToast: "error",
    onSuccess: (response) => {
      queryClient.setQueryData(highlightQueryKeys.detail(id), response);
      void queryClient.invalidateQueries({ queryKey: highlightQueryKeys.all });
      onUpdated?.(response.data.data);
    },
  });
}

export function useDeleteHighlight(id: string, onDeleted?: () => void) {
  const queryClient = useQueryClient();
  return useSend<void, unknown>(`/highlights/${id}`, {
    method: "delete",
    hideToast: "error",
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: highlightQueryKeys.all });
      queryClient.removeQueries({ queryKey: highlightQueryKeys.detail(id) });
      onDeleted?.();
    },
  });
}
