"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export type PickableAsset = { id: string; name: string; assetTag: string };

export function AssetPicker({
  assets,
  selected,
  onChange,
}: {
  assets: PickableAsset[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.assetTag.toLowerCase().includes(query.toLowerCase()),
  );

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        placeholder="Search assets…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="max-h-56 overflow-y-auto rounded-lg border">
        {filtered.map((a) => (
          <label
            key={a.id}
            className="flex items-center gap-2 border-b px-3 py-2 text-sm last:border-0 hover:bg-muted/50"
          >
            <Checkbox checked={selected.has(a.id)} onCheckedChange={() => toggle(a.id)} />
            <span className="flex-1">{a.name}</span>
            <span className="font-mono text-xs text-muted-foreground">{a.assetTag}</span>
          </label>
        ))}
        {filtered.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">No assets found.</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{selected.size} selected</p>
    </div>
  );
}
