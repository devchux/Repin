"use client";

import type {
  CreateMemoryFromBookmarkRequest,
  CreateMemoryFromNoteRequest,
  CreateMemoryFromHighlightRequest,
  Memory,
} from "@repo/contracts/memory";
import { useQueryClient } from "@repo/client/query";

import { useFetch } from "@/hooks/useFetch";
import { useSend } from "@/hooks/useSend";

const memoryQueryKeys = {
  fromBookmark: (bookmarkId: string) =>
    ["memories", "from-bookmark", bookmarkId] as const,
  fromNote: (noteId: string) => ["memories", "from-note", noteId] as const,
  fromHighlight: (highlightId: string) =>
    ["memories", "from-highlight", highlightId] as const,
};

export function useBookmarkMemory(bookmarkId: string) {
  return useFetch<Memory | null>(`/memories/from-bookmark/${bookmarkId}`, {
    hideToast: "all",
    queryKey: memoryQueryKeys.fromBookmark(bookmarkId),
  });
}

export function useNoteMemory(noteId: string) {
  return useFetch<Memory | null>(`/memories/from-note/${noteId}`, {
    enabled: Boolean(noteId),
    hideToast: "all",
    queryKey: memoryQueryKeys.fromNote(noteId),
  });
}

export function useHighlightMemory(highlightId: string) {
  return useFetch<Memory | null>(
    `/memories/from-highlight/${highlightId}`,
    {
      enabled: Boolean(highlightId),
      hideToast: "all",
      queryKey: memoryQueryKeys.fromHighlight(highlightId),
    },
  );
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

export function useCreateMemoryFromNote(onCreated?: (memory: Memory) => void) {
  const queryClient = useQueryClient();
  return useSend<CreateMemoryFromNoteRequest, Memory>("/memories/from-note", {
    hideToast: "error",
    onSuccess: (response, request) => {
      void queryClient.invalidateQueries({
        queryKey: memoryQueryKeys.fromNote(request.sourceId),
      });
      onCreated?.(response.data.data);
    },
  });
}

export function useCreateMemoryFromHighlight(
  onCreated?: (memory: Memory) => void,
) {
  const queryClient = useQueryClient();
  return useSend<CreateMemoryFromHighlightRequest, Memory>(
    "/memories/from-highlight",
    {
      hideToast: "error",
      onSuccess: (response, request) => {
        void queryClient.invalidateQueries({
          queryKey: memoryQueryKeys.fromHighlight(request.sourceId),
        });
        onCreated?.(response.data.data);
      },
    },
  );
}
