import { Skeleton } from "@/components/ui/skeleton";

function PictureGridSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      <Skeleton className="h-9 w-full" />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <PictureGridSkeleton />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-32" />
        <PictureGridSkeleton />
      </div>
    </div>
  );
}
