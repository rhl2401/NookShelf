"use client";

import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export type AssetOption = { id: string; name: string; assetTag: string };

/** A searchable "pick an asset" combobox — used where a plain Select would force
 * scrolling through every asset in the workspace to find one by name. */
export function AssetCombobox({
  value,
  onChange,
  options,
  placeholder = "None",
}: {
  value: string; // "none" or an asset id
  onChange: (id: string) => void;
  options: AssetOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" className="w-full justify-between font-normal">
            <span className="truncate">
              {selected ? `${selected.name} (${selected.assetTag})` : placeholder}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-96 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search assets…" />
          <CommandList>
            <CommandEmpty>No assets found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="none"
                data-checked={value === "none"}
                onSelect={() => {
                  onChange("none");
                  setOpen(false);
                }}
              >
                {placeholder}
              </CommandItem>
              {options.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`${o.name} ${o.assetTag}`}
                  data-checked={value === o.id}
                  onSelect={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                >
                  {o.name} ({o.assetTag})
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
