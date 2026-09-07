"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

/** A plain text input with a click-to-fill dropdown of remembered values — free text stays fully editable. */
export function SuggestInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const matches = suggestions
    .filter((s) => s !== value && s.toLowerCase().includes(value.trim().toLowerCase()))
    .slice(0, 8);

  return (
    <div className="relative">
      <Input
        value={value}
        placeholder={placeholder}
        className={className}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
          {matches.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s);
                setOpen(false);
              }}
              className="block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-muted"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
