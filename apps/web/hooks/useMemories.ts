"use client";

import type {
  CreateMemoryFromBookmarkRequest,
  Memory,
} from "@repo/contracts/memory";
import { useQueryClient } from "@repo/client/query";

import { useFetch } from "@/hooks/useFetch";
import { useSend } from "@/hooks/useSend";

const memoryQueryKeys = {
  fromBookmark: (bookmarkId: string) =>
    ["memories", "from-bookmark", bookmarkId] as const,
};

export function useBookmarkMemory(bookmarkId: string) {
  return useFetch<Memory | null>(`/memories/from-bookmark/${bookmarkId}`, {
    hideToast: "all",
    queryKey: memoryQueryKeys.fromBookmark(bookmarkId),
  });
}

export function useCreateMemoryFromBookmark(
  onCreated?: (memory: Memory) => void,
) {
  const queryClient = useQueryClient();
  return useSend<CreateMemoryFromBookmarkRequest, Memory>(
    "/memories/from-bookmark",
    {
      hideToast: "error",
      onSuccess: (response, request) => {
        void queryClient.invalidateQueries({
          queryKey: memoryQueryKeys.fromBookmark(request.sourceId),
        });
        onCreated?.(response.data.data);
      },
    },
  );
}
