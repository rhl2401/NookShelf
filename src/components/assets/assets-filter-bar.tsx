"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ASSET_STATUSES, assetStatusLabel } from "@/lib/asset-status";

export function AssetsFilterBar({
  assetTypes,
  flatLocations,
  tags,
}: {
  assetTypes: Array<{ id: string; name: string }>;
  flatLocations: Array<{ id: string; label: string }>;
  tags: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedTags = searchParams.getAll("tags");
  // Controlled (not defaultValue) so "Remove filters" can clear the visible
  // text immediately — a defaultValue-based input only reads the URL once,
  // on mount, so pushing a new URL alone wouldn't visually clear it.
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  const hasActiveFilters =
    Boolean(searchParams.get("q")) ||
    Boolean(searchParams.get("type")) ||
    Boolean(searchParams.get("location")) ||
    Boolean(searchParams.get("status")) ||
    selectedTags.length > 0;

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleTag(tag: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tags");
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    for (const t of next) params.append("tags", t);
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ["q", "type", "location", "status", "tags"]) params.delete(key);
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    setQuery("");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search assets…"
        value={query}
        className="w-56"
        onChange={(e) => {
          setQuery(e.target.value);
          setParam("q", e.target.value);
        }}
      />
      <Select
        value={searchParams.get("type") ?? "all"}
        onValueChange={(v) => setParam("type", v ?? "all")}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All types">
            {(v: string) => (v === "all" ? "All types" : assetTypes.find((t) => t.id === v)?.name)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {assetTypes.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("location") ?? "all"}
        onValueChange={(v) => setParam("location", v ?? "all")}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All locations">
            {(v: string) =>
              v === "all" ? "All locations" : flatLocations.find((l) => l.id === v)?.label
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All locations</SelectItem>
          {flatLocations.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              {l.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("status") ?? "all"}
        onValueChange={(v) => setParam("status", v ?? "all")}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All statuses">
            {(v: string) => (v === "all" ? "All statuses" : assetStatusLabel(v))}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {ASSET_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {tags.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" className="w-40 justify-between font-normal">
                <span className="truncate">
                  {selectedTags.length === 0
                    ? "All tags"
                    : selectedTags.length === 1
                      ? selectedTags[0]
                      : `${selectedTags.length} tags`}
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
            {tags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag}
                checked={selectedTags.includes(tag)}
                onCheckedChange={() => toggleTag(tag)}
              >
                {tag}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="size-3.5" /> Remove filters
        </Button>
      )}
    </div>
  );
}
