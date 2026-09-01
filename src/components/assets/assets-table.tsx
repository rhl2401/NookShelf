"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { assetStatusBadgeVariant, assetStatusLabel } from "@/lib/asset-status";
import { bulkAssign, bulkMove, bulkRetire, bulkTag } from "@/lib/actions/assets";
import { AssetPicture } from "@/components/asset-picture";

type AssetRow = {
  id: string;
  assetTag: string;
  name: string;
  status: string;
  icon: string | null;
  primaryPhotoId: string | null;
  assetType: { name: string; icon: string | null };
  location: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  tags: Array<{ tag: { name: string } }>;
};

export function AssetsTable({
  assets,
  flatLocations,
  people,
  canManage,
}: {
  assets: AssetRow[];
  flatLocations: Array<{ id: string; label: string }>;
  people: Array<{ id: string; name: string }>;
  canManage: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [bulkTagValue, setBulkTagValue] = useState("");
  const router = useRouter();

  const allSelected = assets.length > 0 && selected.size === assets.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(assets.map((a) => a.id)));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runBulk(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        await action();
        toast.success("Updated");
        setSelected(new Set());
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {canManage && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2 text-sm">
          <span className="px-1 font-medium">{selected.size} selected</span>

          <Select<string>
            onValueChange={(v) =>
              v && runBulk(() => bulkMove(Array.from(selected), v === "none" ? null : v))
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Move to…">
                {(v: string) =>
                  v === "none" ? "No location" : flatLocations.find((l) => l.id === v)?.label
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No location</SelectItem>
              {flatLocations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select<string>
            onValueChange={(v) =>
              v && runBulk(() => bulkAssign(Array.from(selected), v === "none" ? null : v))
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Assign to…">
                {(v: string) => (v === "none" ? "Unassigned" : people.find((p) => p.id === v)?.name)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {people.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Input
              placeholder="Add tag…"
              className="h-8 w-32"
              value={bulkTagValue}
              onChange={(e) => setBulkTagValue(e.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!bulkTagValue}
              onClick={() => {
                runBulk(() =>
                  bulkTag(
                    Array.from(selected),
                    bulkTagValue.split(",").map((t) => t.trim()).filter(Boolean),
                  ),
                );
                setBulkTagValue("");
              }}
            >
              Tag
            </Button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => runBulk(() => bulkRetire(Array.from(selected)))}
            disabled={isPending}
          >
            Retire
          </Button>

          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<a href={`/labels/print?ids=${Array.from(selected).join(",")}`} target="_blank" rel="noreferrer" />}
          >
            Print labels
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {canManage && (
                <TableHead className="w-8">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </TableHead>
              )}
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Assigned to</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id}>
                {canManage && (
                  <TableCell>
                    <Checkbox
                      checked={selected.has(asset.id)}
                      onCheckedChange={() => toggleOne(asset.id)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Link href={`/assets/${asset.id}`} className="flex items-center gap-2 hover:underline">
                    <AssetPicture
                      photoAttachmentId={asset.primaryPhotoId}
                      icon={asset.icon}
                      typeIcon={asset.assetType.icon}
                      alt={asset.name}
                      size="sm"
                    />
                    <span>
                      <span className="font-medium">{asset.name}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {asset.assetTag}
                      </span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell>{asset.assetType.name}</TableCell>
                <TableCell>{asset.location?.name ?? "—"}</TableCell>
                <TableCell>{asset.assignedTo?.name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={assetStatusBadgeVariant(asset.status)}>
                    {assetStatusLabel(asset.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.map((t) => (
                      <Badge key={t.tag.name} variant="outline">
                        {t.tag.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {assets.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No assets match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
