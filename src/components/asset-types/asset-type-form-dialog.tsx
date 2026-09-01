"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogTriggerButton } from "@/components/dialog-trigger-button";
import { FieldSchemaEditor } from "@/components/asset-types/field-schema-editor";
import { IconPicker } from "@/components/icon-picker";
import { PicturePicker } from "@/components/pictures/picture-picker";
import type { PictureRef } from "@/components/pictures/picture-row";
import { createAssetType, updateAssetType } from "@/lib/actions/asset-types";
import type { AssetFieldDef } from "@/lib/asset-fields";

export function AssetTypeFormDialog({
  trigger,
  assetType,
  myPictures,
  workspacePictures,
}: {
  trigger: React.ReactElement;
  assetType?: {
    id: string;
    name: string;
    category: string | null;
    icon?: string | null;
    iconColor?: string | null;
    primaryPictureId?: string | null;
    fieldSchema: unknown;
  };
  myPictures: PictureRef[];
  workspacePictures: PictureRef[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(assetType?.name ?? "");
  const [category, setCategory] = useState(assetType?.category ?? "");
  const [icon, setIcon] = useState<string | null>(assetType?.icon ?? null);
  const [iconColor, setIconColor] = useState<string | null>(assetType?.iconColor ?? null);
  const [pictureId, setPictureId] = useState<string | null>(assetType?.primaryPictureId ?? null);
  const [fields, setFields] = useState<AssetFieldDef[]>(
    (assetType?.fieldSchema as AssetFieldDef[] | undefined) ?? [],
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      try {
        const cleanedFields = fields.filter((f) => f.key && f.label);
        if (assetType?.id) {
          await updateAssetType(assetType.id, {
            name,
            category,
            icon: icon ?? undefined,
            iconColor: iconColor ?? undefined,
            primaryPictureId: pictureId ?? undefined,
            fieldSchema: cleanedFields,
          });
        } else {
          await createAssetType({
            name,
            category,
            icon: icon ?? undefined,
            iconColor: iconColor ?? undefined,
            primaryPictureId: pictureId ?? undefined,
            fieldSchema: cleanedFields,
          });
        }
        toast.success(assetType?.id ? "Asset type updated" : "Asset type created");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTriggerButton trigger={trigger} />
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{assetType?.id ? "Edit asset type" : "New asset type"}</DialogTitle>
          <DialogDescription>
            Define the custom fields assets of this type will carry.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="asset-type-name">Name</Label>
              <Input id="asset-type-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="asset-type-category">Category</Label>
              <Input
                id="asset-type-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Electronics"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Icon</Label>
              <IconPicker
                value={icon}
                onChange={setIcon}
                color={iconColor}
                onColorChange={setIconColor}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Picture</Label>
              <PicturePicker
                value={pictureId}
                onChange={setPictureId}
                myPictures={myPictures}
                workspacePictures={workspacePictures}
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            This picture is shown only on the asset type itself — assets of this type keep using
            their own picture or icon, never this one.
          </p>

          <div className="grid gap-1.5">
            <Label>Custom fields</Label>
            <FieldSchemaEditor value={fields} onChange={setFields} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !name}>
            {assetType?.id ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
