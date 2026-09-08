import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-40" />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="flex items-center gap-6 border-b bg-muted/30 p-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 border-b p-3 last:border-0">
            <div className="flex w-32 items-center gap-2">
              <Skeleton className="size-6 shrink-0 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
