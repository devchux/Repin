"use client";

import { useQueryClient } from "@repo/client/query";
import type {
  CreateNoteRequest,
  Note,
  NotesPage,
  UpdateNoteRequest,
} from "@repo/contracts/note";

import { useFetch } from "@/hooks/useFetch";
import { useSend } from "@/hooks/useSend";

export const noteQueryKeys = {
  all: ["notes"] as const,
  detail: (id: string) => ["notes", id] as const,
};

export function useNotes(params: {
  readonly search?: string;
  readonly page?: number;
  readonly limit?: number;
}) {
  return useFetch<NotesPage>("/notes", {
    hideToast: "all",
    params: {
      search: params.search || undefined,
      page: params.page ?? 1,
      limit: params.limit ?? 100,
    },
    queryKey: [...noteQueryKeys.all, params],
  });
}

export function useNote(id: string, enabled = true) {
  return useFetch<Note>(`/notes/${id}`, {
    enabled,
    hideToast: "all",
    queryKey: noteQueryKeys.detail(id),
  });
}

export function useCreateNote(onCreated?: (note: Note) => void) {
  const queryClient = useQueryClient();
  return useSend<CreateNoteRequest, Note>("/notes", {
    hideToast: "error",
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: noteQueryKeys.all });
      onCreated?.(response.data.data);
    },
  });
}

export function useUpdateNote(id: string, onUpdated?: (note: Note) => void) {
  const queryClient = useQueryClient();
  return useSend<UpdateNoteRequest, Note>(`/notes/${id}`, {
    method: "patch",
    hideToast: "error",
    onSuccess: (response) => {
      queryClient.setQueryData(noteQueryKeys.detail(id), response);
      void queryClient.invalidateQueries({ queryKey: noteQueryKeys.all });
      onUpdated?.(response.data.data);
    },
  });
}

export function useDeleteNote(id: string, onDeleted?: () => void) {
  const queryClient = useQueryClient();
  return useSend<void, unknown>(`/notes/${id}`, {
    method: "delete",
    hideToast: "error",
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: noteQueryKeys.all });
      queryClient.removeQueries({ queryKey: noteQueryKeys.detail(id) });
      onDeleted?.();
    },
  });
}
