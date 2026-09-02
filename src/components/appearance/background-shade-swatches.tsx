"use client";

import { Check } from "lucide-react";
import {
  BACKGROUND_SHADE_KEYS,
  backgroundShadeLabel,
  backgroundShadeSwatch,
  type BackgroundShadeKey,
} from "@/lib/background-shades";
import { cn } from "@/lib/utils";

export function BackgroundShadeSwatches({
  value,
  onSelect,
  allowDefault,
}: {
  value: BackgroundShadeKey | null;
  onSelect: (key: BackgroundShadeKey | null) => void;
  /** Shows a "Workspace default" option that clears the personal override. */
  allowDefault?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {allowDefault && (
        <button
          type="button"
          title="Use workspace default"
          onClick={() => onSelect(null)}
          className={cn(
            "flex size-7 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 bg-muted",
            value === null && "ring-2 ring-ring ring-offset-1 ring-offset-background",
          )}
        />
      )}
      {BACKGROUND_SHADE_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          title={backgroundShadeLabel(key)}
          onClick={() => onSelect(key)}
          style={{ backgroundColor: backgroundShadeSwatch(key) }}
          className={cn(
            "flex size-7 items-center justify-center rounded-full border",
            value === key && "ring-2 ring-ring ring-offset-1 ring-offset-background",
          )}
        >
          {value === key && <Check className="size-3.5 text-foreground/70" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}
