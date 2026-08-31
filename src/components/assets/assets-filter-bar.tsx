"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ASSET_STATUSES, assetStatusLabel } from "@/lib/asset-status";

export function AssetsFilterBar({
  assetTypes,
  flatLocations,
}: {
  assetTypes: Array<{ id: string; name: string }>;
  flatLocations: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search assets…"
        defaultValue={searchParams.get("q") ?? ""}
        className="w-56"
        onChange={(e) => setParam("q", e.target.value)}
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
    </div>
  );
}
