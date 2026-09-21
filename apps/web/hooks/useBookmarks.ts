"use client";

import type {
  Bookmark,
  BookmarkCollection,
  BookmarksPage,
  CreateBookmarkCollectionRequest,
  CreateBookmarkRequest,
  UpdateBookmarkRequest,
} from "@repo/contracts/bookmark";
import { useQueryClient } from "@repo/client/query";

import { useFetch } from "@/hooks/useFetch";
import { useSend } from "@/hooks/useSend";

export const bookmarkQueryKeys = {
  all: ["bookmarks"] as const,
  collections: ["bookmark-collections"] as const,
  detail: (id: string) => ["bookmarks", id] as const,
};

export function useBookmarks(params: {
  readonly search?: string;
  readonly collectionId?: string;
  readonly page?: number;
  readonly limit?: number;
}) {
  return useFetch<BookmarksPage>("/bookmarks", {
    hideToast: "all",
    params: {
      search: params.search || undefined,
      searchMode: params.search ? "lexical" : undefined,
      collectionId: params.collectionId || undefined,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
    queryKey: [...bookmarkQueryKeys.all, params],
  });
}

export function useBookmark(id: string) {
  return useFetch<Bookmark>(`/bookmarks/${id}`, {
    hideToast: "all",
    queryKey: bookmarkQueryKeys.detail(id),
  });
}

export function useBookmarkCollections() {
  return useFetch<readonly BookmarkCollection[]>("/bookmark-collections", {
    hideToast: "all",
    queryKey: bookmarkQueryKeys.collections,
  });
}

export function useCreateBookmark(onCreated?: (bookmark: Bookmark) => void) {
  const queryClient = useQueryClient();
  return useSend<CreateBookmarkRequest, Bookmark>("/bookmarks", {
    hideToast: "error",
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: bookmarkQueryKeys.all });
      onCreated?.(response.data.data);
    },
  });
}

export function useUpdateBookmark(id: string) {
  const queryClient = useQueryClient();
  return useSend<UpdateBookmarkRequest, Bookmark>(`/bookmarks/${id}`, {
    method: "patch",
    hideToast: "error",
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookmarkQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: bookmarkQueryKeys.detail(id) });
    },
  });
}

export function useDeleteBookmark(id: string, onDeleted?: () => void) {
  const queryClient = useQueryClient();
  return useSend<void, unknown>(`/bookmarks/${id}`, {
    method: "delete",
    hideToast: "error",
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookmarkQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: bookmarkQueryKeys.collections });
      onDeleted?.();
    },
  });
}

export function useCreateBookmarkCollection(onCreated?: () => void) {
  const queryClient = useQueryClient();
  return useSend<CreateBookmarkCollectionRequest, BookmarkCollection>(
    "/bookmark-collections",
    {
      hideToast: "error",
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: bookmarkQueryKeys.collections });
        onCreated?.();
      },
    },
  );
}

export function useDeleteBookmarkCollection(id: string, onDeleted?: () => void) {
  const queryClient = useQueryClient();
  return useSend<void, unknown>(`/bookmark-collections/${id}`, {
    method: "delete",
    hideToast: "error",
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookmarkQueryKeys.collections });
      void queryClient.invalidateQueries({ queryKey: bookmarkQueryKeys.all });
      onDeleted?.();
    },
  });
}

export function useAddBookmarkToCollection(
  collectionId: string,
  bookmarkId: string,
  onAdded?: () => void,
) {
  const queryClient = useQueryClient();
  return useSend<void, unknown>(
    `/bookmark-collections/${collectionId}/bookmarks/${bookmarkId}`,
    {
      hideToast: "error",
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: bookmarkQueryKeys.all });
        void queryClient.invalidateQueries({ queryKey: bookmarkQueryKeys.collections });
        onAdded?.();
      },
    },
  );
}

export function useRemoveBookmarkFromCollection(
  collectionId: string,
  bookmarkId: string,
  onRemoved?: () => void,
) {
  const queryClient = useQueryClient();
  return useSend<void, unknown>(
    `/bookmark-collections/${collectionId}/bookmarks/${bookmarkId}`,
    {
      method: "delete",
      hideToast: "error",
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: bookmarkQueryKeys.all });
        void queryClient.invalidateQueries({ queryKey: bookmarkQueryKeys.collections });
        onRemoved?.();
      },
    },
  );
}
