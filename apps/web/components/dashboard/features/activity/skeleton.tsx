import { Skeleton } from "@repo/ui/skeleton";

export function ActivitySkeleton() {
  return (
    <div className="divide-y" aria-label="Loading activity">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex gap-4 p-5">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="mt-3 h-3 w-3/5" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}