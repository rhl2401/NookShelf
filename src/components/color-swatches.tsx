"use client";

import { Check } from "lucide-react";
import { ICON_COLORS } from "@/lib/icon-colors";
import { cn } from "@/lib/utils";

export function ColorSwatches({
  value,
  onSelect,
}: {
  value: string | null;
  onSelect: (color: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        title="No color"
        onClick={() => onSelect(null)}
        className={cn(
          "flex size-6 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 bg-muted",
          value === null && "ring-2 ring-ring ring-offset-1 ring-offset-background",
        )}
      />
      {ICON_COLORS.map((c) => (
        <button
          key={c.key}
          type="button"
          title={c.label}
          onClick={() => onSelect(c.key)}
          className={cn(
            "flex size-6 items-center justify-center rounded-full",
            c.swatch,
            value === c.key && "ring-2 ring-ring ring-offset-1 ring-offset-background",
          )}
        >
          {value === c.key && <Check className="size-3.5 text-white" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}
