"use client";

import type {
  CreateMemoryFromBookmarkRequest,
  CreateMemoryFromNoteRequest,
  CreateMemoryFromHighlightRequest,
  Memory,
  MemoryKind,
  MemoryScope,
  UpdateMemoryRequest,
} from "@repo/contracts/memory";
import { useQueryClient } from "@repo/client/query";

import { useFetch } from "@/hooks/useFetch";
import { useSend } from "@/hooks/useSend";

const memoryQueryKeys = {
  all: ["memories"] as const,
  fromBookmark: (bookmarkId: string) =>
    ["memories", "from-bookmark", bookmarkId] as const,
  fromNote: (noteId: string) => ["memories", "from-note", noteId] as const,
  fromHighlight: (highlightId: string) =>
    ["memories", "from-highlight", highlightId] as const,
};

export function useMemories(params: {
  readonly query?: string;
  readonly kind?: MemoryKind;
  readonly scope?: MemoryScope;
  readonly limit?: number;
}) {
  return useFetch<readonly Memory[]>("/memories", {
    hideToast: "all",
    params: {
      query: params.query || undefined,
      kind: params.kind,
      scope: params.scope,
      limit: params.limit ?? 100,
    },
    queryKey: [...memoryQueryKeys.all, params],
  });
}

export function useUpdateMemory(
  id: string,
  onUpdated?: (memory: Memory) => void,
) {
  const queryClient = useQueryClient();
  return useSend<UpdateMemoryRequest, Memory>(`/memories/${id}`, {
    method: "patch",
    hideToast: "error",
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: memoryQueryKeys.all });
      onUpdated?.(response.data.data);
    },
  });
}

export function useForgetMemory(id: string, onForgotten?: () => void) {
  const queryClient = useQueryClient();
  return useSend<void, unknown>(`/memories/${id}`, {
    method: "delete",
    hideToast: "error",
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: memoryQueryKeys.all });
      onForgotten?.();
    },
  });
}

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
  return useFetch<Memory | null>(`/memories/from-highlight/${highlightId}`, {
    enabled: Boolean(highlightId),
    hideToast: "all",
    queryKey: memoryQueryKeys.fromHighlight(highlightId),
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
