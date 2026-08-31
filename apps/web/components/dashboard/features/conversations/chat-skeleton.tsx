import { Skeleton } from "@repo/ui/skeleton";

export function ChatSkeleton() {
  return (
    <div className="flex-1 space-y-8 py-8" aria-label="Loading conversation">
      <Skeleton className="ml-auto h-20 w-2/3 rounded-xl" />
      <Skeleton className="h-28 w-3/4 rounded-xl" />
      <Skeleton className="ml-auto h-16 w-1/2 rounded-xl" />
    </div>
  );
}
