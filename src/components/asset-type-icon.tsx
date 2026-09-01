"use client";

import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { cn } from "@/lib/utils";
import { isValidIconName } from "@/lib/icon-names";

export const PICTURE_CONTAINER_SIZE = {
  sm: "size-8 rounded-lg",
  md: "size-12 rounded-xl",
  lg: "size-16 rounded-xl",
  xl: "size-28 rounded-2xl",
} as const;

const GLYPH_SIZE = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
  xl: "size-14",
} as const;

const CONTAINER_SIZE = PICTURE_CONTAINER_SIZE;

export function AssetTypeIcon({
  icon,
  size = "md",
  className,
}: {
  icon: string | null | undefined;
  size?: keyof typeof CONTAINER_SIZE;
  className?: string;
}) {
  const validIcon = icon && isValidIconName(icon) ? (icon as IconName) : null;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center",
        validIcon ? "bg-muted" : "border border-dashed border-muted-foreground/25",
        CONTAINER_SIZE[size],
        className,
      )}
    >
      {validIcon && (
        <DynamicIcon
          name={validIcon}
          className={cn("text-foreground/80", GLYPH_SIZE[size])}
          strokeWidth={1.5}
        />
      )}
    </div>
  );
}
