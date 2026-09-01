"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { AssetTypeIcon } from "@/components/asset-type-icon";
import { IconGrid } from "@/components/icon-grid";
import { humanizeIconName } from "@/lib/icon-names";

export function IconPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (icon: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" className="h-auto w-full justify-between gap-2 py-1.5" />
        }
      >
        <span className="flex items-center gap-2">
          <AssetTypeIcon icon={value} size="sm" />
          <span className="text-sm">{value ? humanizeIconName(value) : "No icon"}</span>
        </span>
        <ChevronDown className="size-4 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-2 p-2">
        <IconGrid
          value={value}
          onSelect={(icon) => {
            onChange(icon);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
