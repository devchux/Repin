import { Skeleton } from "@repo/ui/skeleton";

export function ConversationSkeleton() {
  return (
    <div className="divide-y" aria-label="Loading conversations">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="p-5">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="mt-3 h-3 w-4/5" />
          <Skeleton className="mt-3 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
