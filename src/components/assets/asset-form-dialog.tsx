"use client";

import { useMemo, useState, useTransition } from "react";
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
import { DialogTriggerButton } from "@/components/dialog-trigger-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomFieldsForm, type CustomFieldValues } from "@/components/assets/custom-fields-form";
import { TagsInput } from "@/components/ui-custom/tags-input";
import { PictureIconEditor } from "@/components/pictures/picture-icon-editor";
import type { PictureRef } from "@/components/pictures/picture-row";
import { createAsset, updateAsset } from "@/lib/actions/assets";
import type { AssetFieldDef } from "@/lib/asset-fields";
import { ASSET_STATUSES } from "@/lib/asset-status";
import { CURRENCIES } from "@/lib/currency-shared";

type AssetTypeOption = { id: string; name: string; fieldSchema: unknown };
type LocationOption = { id: string; label: string };
type PersonOption = { id: string; name: string };
type AssetOption = { id: string; name: string; assetTag: string };

export function AssetFormDialog({
  trigger,
  assetTypes,
  flatLocations,
  people,
  assetOptions,
  asset,
  defaultAssetTypeId,
  defaultCurrency = "USD",
  myPictures = [],
  workspacePictures = [],
}: {
  trigger: React.ReactElement;
  assetTypes: AssetTypeOption[];
  flatLocations: LocationOption[];
  people: PersonOption[];
  assetOptions: AssetOption[];
  defaultAssetTypeId?: string;
  defaultCurrency?: string;
  myPictures?: PictureRef[];
  workspacePictures?: PictureRef[];
  asset?: {
    id: string;
    name: string;
    assetTypeId: string;
    locationId: string | null;
    assignedToId: string | null;
    parentAssetId: string | null;
    status: string;
    notes: string | null;
    purchaseDate: Date | string | null;
    purchasePrice: unknown;
    purchaseCurrency: string | null;
    vendor: string | null;
    warrantyExpiresAt: Date | string | null;
    customFields: unknown;
    tags?: string[];
  };
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(asset?.name ?? "");
  const [assetTypeId, setAssetTypeId] = useState(
    asset?.assetTypeId ??
      defaultAssetTypeId ??
      assetTypes.find((t) => t.name === "Generic")?.id ??
      assetTypes[0]?.id ??
      "",
  );
  const [locationId, setLocationId] = useState(asset?.locationId ?? "none");
  const [assignedToId, setAssignedToId] = useState(asset?.assignedToId ?? "none");
  const [parentAssetId, setParentAssetId] = useState(asset?.parentAssetId ?? "none");
  const [status, setStatus] = useState(asset?.status ?? "IN_STORAGE");
  const [notes, setNotes] = useState(asset?.notes ?? "");
  const [purchaseDate, setPurchaseDate] = useState(toDateInput(asset?.purchaseDate));
  const [purchasePrice, setPurchasePrice] = useState(
    asset?.purchasePrice != null ? String(asset.purchasePrice) : "",
  );
  const [purchaseCurrency, setPurchaseCurrency] = useState(
    asset?.purchaseCurrency ?? defaultCurrency,
  );
  const [vendor, setVendor] = useState(asset?.vendor ?? "");
  const [warrantyExpiresAt, setWarrantyExpiresAt] = useState(
    toDateInput(asset?.warrantyExpiresAt),
  );
  const [tags, setTags] = useState<string[]>(asset?.tags ?? []);
  const [customFields, setCustomFields] = useState<CustomFieldValues>(
    (asset?.customFields as CustomFieldValues) ?? {},
  );
  const [icon, setIcon] = useState<string | null>(null);
  const [iconColor, setIconColor] = useState<string | null>(null);
  const [pictureId, setPictureId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const fieldSchema = useMemo(
    () => (assetTypes.find((t) => t.id === assetTypeId)?.fieldSchema as AssetFieldDef[]) ?? [],
    [assetTypes, assetTypeId],
  );

  function submit() {
    startTransition(async () => {
      try {
        const input = {
          name,
          assetTypeId,
          locationId: locationId === "none" ? null : locationId,
          assignedToId: assignedToId === "none" ? null : assignedToId,
          parentAssetId: parentAssetId === "none" ? null : parentAssetId,
          status: status as (typeof ASSET_STATUSES)[number]["value"],
          notes,
          purchaseDate: purchaseDate || undefined,
          purchasePrice: purchasePrice || undefined,
          purchaseCurrency: purchasePrice ? purchaseCurrency : undefined,
          vendor,
          warrantyExpiresAt: warrantyExpiresAt || undefined,
          tags,
          customFields,
        };
        if (asset?.id) {
          await updateAsset(asset.id, input);
        } else {
          await createAsset({ ...input, icon, iconColor, primaryPictureId: pictureId });
        }
        toast.success(asset?.id ? "Asset updated" : "Asset created");
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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{asset?.id ? "Edit asset" : "New asset"}</DialogTitle>
          <DialogDescription>
            {asset?.id ? "Update this asset's details." : "Add a new asset to your inventory."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 grid gap-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            {!asset?.id && (
              <div className="col-span-2 grid gap-1.5">
                <PictureIconEditor
                  label="Icon / picture"
                  name={name || "Asset"}
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
                  Once created, change the photo or icon from the asset&apos;s own page.
                </p>
              </div>
            )}

            <div className="grid gap-1.5">
              <Label>Asset type</Label>
              <Select value={assetTypeId} onValueChange={(v) => v && setAssetTypeId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v: string) => assetTypes.find((t) => t.id === v)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {assetTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v: string) => ASSET_STATUSES.find((s) => s.value === v)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ASSET_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Location</Label>
              <Select value={locationId ?? "none"} onValueChange={(v) => setLocationId(v ?? "none")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No location">
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
            </div>

            <div className="grid gap-1.5">
              <Label>Assigned to</Label>
              <Select
                value={assignedToId ?? "none"}
                onValueChange={(v) => setAssignedToId(v ?? "none")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unassigned">
                    {(v: string) =>
                      v === "none" ? "Unassigned" : people.find((p) => p.id === v)?.name
                    }
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
              <p className="text-xs text-muted-foreground">
                Sets ownership only — it doesn&apos;t create a checkout or due date. Use Check out
                for that.
              </p>
            </div>

            <div className="col-span-2 grid gap-1.5">
              <Label>Part of (parent asset)</Label>
              <Select
                value={parentAssetId ?? "none"}
                onValueChange={(v) => setParentAssetId(v ?? "none")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None">
                    {(v: string) =>
                      v === "none" ? "None" : assetOptions.find((a) => a.id === v)?.name
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {assetOptions
                    .filter((a) => a.id !== asset?.id)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.assetTag})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Purchase date</Label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Purchase price</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  className="flex-1"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                />
                <Select value={purchaseCurrency} onValueChange={(v) => v && setPurchaseCurrency(v)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Vendor</Label>
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Warranty expires</Label>
              <Input
                type="date"
                value={warrantyExpiresAt}
                onChange={(e) => setWarrantyExpiresAt(e.target.value)}
              />
            </div>

            <div className="col-span-2 grid gap-1.5">
              <Label>Tags</Label>
              <TagsInput value={tags} onChange={setTags} placeholder="Type a tag, then comma or enter" />
            </div>

            <div className="col-span-2 grid gap-1.5">
              <Label>Notes</Label>
              <Textarea value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>

          {fieldSchema.length > 0 && (
            <div className="grid gap-1.5 border-t pt-3">
              <Label className="text-muted-foreground">
                {assetTypes.find((t) => t.id === assetTypeId)?.name} fields
              </Label>
              <CustomFieldsForm
                schema={fieldSchema}
                values={customFields}
                onChange={setCustomFields}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !name || !assetTypeId}>
            {asset?.id ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
