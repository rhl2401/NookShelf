import { ChevronRight } from "lucide-react";

export function LocationBreadcrumb({ chain }: { chain: string[] }) {
  if (chain.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {chain.map((name, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3 shrink-0 text-muted-foreground" />}
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{name}</span>
        </span>
      ))}
    </span>
  );
}
