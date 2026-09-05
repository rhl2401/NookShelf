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
import { Checkbox } from "@/components/ui/checkbox";
import { DialogTriggerButton } from "@/components/dialog-trigger-button";
import { FieldSchemaEditor } from "@/components/asset-types/field-schema-editor";
import { PictureIconEditor } from "@/components/pictures/picture-icon-editor";
import { AssetTypeIcon } from "@/components/asset-type-icon";
import type { PictureRef } from "@/components/pictures/picture-row";
import { createAssetType, updateAssetType } from "@/lib/actions/asset-types";
import { STARTER_TEMPLATES, type AssetTypeTemplate } from "@/lib/asset-type-templates";
import type { AssetFieldDef } from "@/lib/asset-fields";
import { cn } from "@/lib/utils";

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
    inheritIcon?: boolean;
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
  const [inheritIcon, setInheritIcon] = useState(assetType?.inheritIcon ?? true);
  const [pictureId, setPictureId] = useState<string | null>(assetType?.primaryPictureId ?? null);
  const [fields, setFields] = useState<AssetFieldDef[]>(
    (assetType?.fieldSchema as AssetFieldDef[] | undefined) ?? [],
  );
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function applyTemplate(template: AssetTypeTemplate) {
    setTemplateName(template.name);
    setName(template.name);
    setCategory(template.category ?? "");
    setIcon(template.icon ?? null);
    setIconColor(template.iconColor ?? null);
    setFields(template.fieldSchema);
  }

  function startBlank() {
    setTemplateName(null);
    setName("");
    setCategory("");
    setIcon(null);
    setIconColor(null);
    setFields([]);
  }

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
            inheritIcon,
            primaryPictureId: pictureId ?? undefined,
            fieldSchema: cleanedFields,
          });
        } else {
          await createAssetType({
            name,
            category,
            icon: icon ?? undefined,
            iconColor: iconColor ?? undefined,
            inheritIcon,
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
          {!assetType?.id && (
            <div className="grid gap-1.5">
              <Label>Start from a template</Label>
              <div className="flex flex-wrap gap-2">
                {STARTER_TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-colors hover:bg-muted/50",
                      templateName === t.name ? "border-primary bg-primary/5" : "border-border",
                    )}
                  >
                    <AssetTypeIcon icon={t.icon} color={t.iconColor} size="sm" />
                    {t.name}
                  </button>
                ))}
                {templateName && (
                  <Button type="button" variant="ghost" size="sm" onClick={startBlank}>
                    Start blank
                  </Button>
                )}
              </div>
            </div>
          )}

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

          <div className="grid gap-1.5">
            <Label>Icon / picture</Label>
            <PictureIconEditor
              name={name || "Asset type"}
              icon={icon}
              onIconChange={setIcon}
              color={iconColor}
              onColorChange={setIconColor}
              pictureId={pictureId}
              onPictureChange={setPictureId}
              myPictures={myPictures}
              workspacePictures={workspacePictures}
            />
            <p className="text-xs text-muted-foreground">
              Shown only on the asset type itself — assets of this type keep using their own
              picture or icon, never this one.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={inheritIcon}
                onCheckedChange={(checked) => setInheritIcon(checked === true)}
              />
              Assets of this type inherit its icon by default
            </label>
            <p className="text-xs text-muted-foreground">
              {inheritIcon
                ? "An asset with no icon of its own shows this type's icon. Turn off if this type is too varied for one shared icon to make sense."
                : "An asset with no icon of its own shows no icon, instead of this type's."}
            </p>
          </div>

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
