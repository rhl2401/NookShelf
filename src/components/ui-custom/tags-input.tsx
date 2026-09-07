"use client";

import { useState, type KeyboardEvent, type ChangeEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TagsInput({
  value,
  onChange,
  placeholder,
  className,
  suggestions = [],
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);

  const matches = suggestions
    .filter((s) => !value.includes(s) && s.toLowerCase().includes(draft.trim().toLowerCase()))
    .slice(0, 8);

  function commit(raw: string) {
    const tag = raw.trim();
    setDraft("");
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
  }

  function remove(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "," || e.key === "Enter") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    if (text.includes(",")) {
      const parts = text.split(",");
      const last = parts.pop() ?? "";
      parts.forEach(commit);
      setDraft(last);
    } else {
      setDraft(text);
    }
  }

  function handleBlur() {
    if (draft.trim()) commit(draft);
  }

  return (
    <div className="relative">
      <div
        className={cn(
          "flex min-h-8 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
          className,
        )}
      >
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="rounded-full outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <X className="size-3" />
              <span className="sr-only">Remove {tag}</span>
            </button>
          </Badge>
        ))}
        <input
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            handleBlur();
            setTimeout(() => setOpen(false), 150);
          }}
          placeholder={value.length === 0 ? placeholder : undefined}
          className="h-6 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {open && matches.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
          {matches.map((tag) => (
            <button
              key={tag}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                commit(tag);
                setOpen(false);
              }}
              className="block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-muted"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
