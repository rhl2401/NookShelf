"use client";

import { useMemo, useState } from "react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { Ban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorSwatches } from "@/components/color-swatches";
import { ALL_ICON_NAMES, POPULAR_ICON_NAMES, humanizeIconName } from "@/lib/icon-names";
import { getIconColor } from "@/lib/icon-colors";
import { cn } from "@/lib/utils";

const SEARCH_RESULT_LIMIT = 120;

/** Search box + grid of selectable icons, with a "No icon" option. Shared by IconPicker and AssetPictureEditor. */
export function IconGrid({
  value,
  onSelect,
  noIconLabel = "No icon",
  color = null,
  onColorChange,
}: {
  value: string | null;
  onSelect: (icon: string | null) => void;
  noIconLabel?: string;
  color?: string | null;
  onColorChange?: (color: string | null) => void;
}) {
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const { names, truncated } = useMemo(() => {
    if (!query) return { names: POPULAR_ICON_NAMES, truncated: false };
    const matches = ALL_ICON_NAMES.filter((n) => n.includes(query));
    return {
      names: matches.slice(0, SEARCH_RESULT_LIMIT),
      truncated: matches.length > SEARCH_RESULT_LIMIT,
    };
  }, [query]);

  const palette = getIconColor(color);
  const glyphClass = palette ? palette.fg : "";

  return (
    <div className="flex flex-col gap-2">
      {onColorChange && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Color</Label>
          <ColorSwatches value={color} onSelect={onColorChange} />
        </div>
      )}
      <Input
        autoFocus
        placeholder="Search icons…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto pr-1">
        <button
          type="button"
          title={noIconLabel}
          onClick={() => onSelect(null)}
          className={cn(
            "flex aspect-square items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 text-muted-foreground hover:bg-muted",
            value === null && "ring-2 ring-ring",
          )}
        >
          <Ban className="size-4" />
        </button>
        {names.map((name) => (
          <button
            key={name}
            type="button"
            title={humanizeIconName(name)}
            onClick={() => onSelect(name)}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg hover:bg-muted",
              value === name && "bg-muted ring-2 ring-ring",
            )}
          >
            <DynamicIcon
              name={name as IconName}
              className={cn("size-4.5", glyphClass)}
              strokeWidth={1.5}
            />
          </button>
        ))}
        {names.length === 0 && (
          <p className="col-span-6 py-6 text-center text-sm text-muted-foreground">
            No icons match &ldquo;{search}&rdquo;.
          </p>
        )}
      </div>
      {truncated && (
        <p className="px-1 text-xs text-muted-foreground">
          Showing first {SEARCH_RESULT_LIMIT} matches — refine your search for more.
        </p>
      )}
    </div>
  );
}
