"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AssetTypeFormDialog } from "@/components/asset-types/asset-type-form-dialog";
import { DeleteAssetTypeButton } from "@/components/asset-types/delete-asset-type-button";
import { ExportTemplateButton } from "@/components/asset-types/export-template-button";
import { AssetPicture } from "@/components/asset-picture";
import type { PictureRef } from "@/components/pictures/picture-row";
import type { AssetFieldDef } from "@/lib/asset-fields";
import { exportAssetTypeTemplateBundle } from "@/lib/actions/asset-types";
import { downloadJson, slugifyFilename } from "@/lib/download-json";

type AssetTypeRow = {
  id: string;
  name: string;
  category: string | null;
  icon: string | null;
  iconColor: string | null;
  inheritIcon: boolean;
  primaryPictureId: string | null;
  isBuiltIn: boolean;
  fieldSchema: unknown;
  _count: { assets: number };
};

export function AssetTypesList({
  assetTypes,
  myPictures,
  workspacePictures,
}: {
  assetTypes: AssetTypeRow[];
  myPictures: PictureRef[];
  workspacePictures: PictureRef[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bundleName, setBundleName] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportBundle() {
    const ids = Array.from(selected);
    startTransition(async () => {
      try {
        const bundle = await exportAssetTypeTemplateBundle(ids, bundleName.trim() || undefined);
        downloadJson(bundle, `${slugifyFilename(bundleName.trim() || "asset-types")}.bundle.json`);
        setSelected(new Set());
        setBundleName("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Export failed");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2 text-sm">
          <span className="px-1 font-medium">{selected.size} selected</span>
          <Input
            placeholder="Bundle name (optional)"
            className="h-8 w-56"
            value={bundleName}
            onChange={(e) => setBundleName(e.target.value)}
          />
          <Button size="sm" onClick={exportBundle} disabled={isPending}>
            <Package className="size-3.5" /> Export as bundle
          </Button>
        </div>
      )}

      {assetTypes.map((assetType) => {
        const fields = (assetType.fieldSchema as AssetFieldDef[]) ?? [];
        return (
          <Card key={assetType.id}>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selected.has(assetType.id)}
                  onCheckedChange={() => toggle(assetType.id)}
                />
                <AssetPicture
                  pictureId={assetType.primaryPictureId}
                  icon={assetType.icon}
                  color={assetType.iconColor}
                  alt={assetType.name}
                  size="lg"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{assetType.name}</p>
                    {assetType.isBuiltIn && <Badge variant="outline">Built-in</Badge>}
                    {assetType.category && <Badge variant="secondary">{assetType.category}</Badge>}
                    <Badge variant="outline">{assetType._count.assets} assets</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {fields.map((f) => (
                      <Badge key={f.key} variant="outline" className="font-mono text-[10px]">
                        {f.label}
                      </Badge>
                    ))}
                    {fields.length === 0 && (
                      <span className="text-xs text-muted-foreground">No custom fields</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <ExportTemplateButton assetTypeId={assetType.id} assetTypeName={assetType.name} />
                <AssetTypeFormDialog
                  assetType={assetType}
                  trigger={<Button variant="outline">Edit</Button>}
                  myPictures={myPictures}
                  workspacePictures={workspacePictures}
                />
                {!assetType.isBuiltIn && <DeleteAssetTypeButton assetTypeId={assetType.id} />}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
