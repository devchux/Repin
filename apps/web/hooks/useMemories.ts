"use client";

import type {
  CreateMemoryFromBookmarkRequest,
  Memory,
} from "@repo/contracts/memory";

import { useSend } from "@/hooks/useSend";

export function useCreateMemoryFromBookmark(
  onCreated?: (memory: Memory) => void,
) {
  return useSend<CreateMemoryFromBookmarkRequest, Memory>(
    "/memories/from-bookmark",
    {
      hideToast: "error",
      onSuccess: (response) => onCreated?.(response.data.data),
    },
  );
}
