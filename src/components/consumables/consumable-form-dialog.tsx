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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogTriggerButton } from "@/components/dialog-trigger-button";
import { PictureIconEditor } from "@/components/pictures/picture-icon-editor";
import type { PictureRef } from "@/components/pictures/picture-row";
import { createConsumable, updateConsumable } from "@/lib/actions/consumables";

export function ConsumableFormDialog({
  trigger,
  consumable,
  flatLocations,
  myPictures,
  workspacePictures,
}: {
  trigger: React.ReactElement;
  consumable?: {
    id: string;
    name: string;
    category: string | null;
    icon?: string | null;
    iconColor?: string | null;
    primaryPictureId?: string | null;
    quantity: number;
    lowStockThreshold: number | null;
    locationId?: string | null;
  };
  flatLocations: Array<{ id: string; label: string }>;
  myPictures: PictureRef[];
  workspacePictures: PictureRef[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(consumable?.name ?? "");
  const [category, setCategory] = useState(consumable?.category ?? "");
  const [icon, setIcon] = useState<string | null>(consumable?.icon ?? null);
  const [iconColor, setIconColor] = useState<string | null>(consumable?.iconColor ?? null);
  const [pictureId, setPictureId] = useState<string | null>(consumable?.primaryPictureId ?? null);
  const [quantity, setQuantity] = useState(String(consumable?.quantity ?? 0));
  const [lowStockThreshold, setLowStockThreshold] = useState(
    consumable?.lowStockThreshold != null ? String(consumable.lowStockThreshold) : "",
  );
  const [locationId, setLocationId] = useState(consumable?.locationId ?? "none");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      try {
        const input = {
          name,
          category: category || undefined,
          icon: icon ?? undefined,
          iconColor: iconColor ?? undefined,
          primaryPictureId: pictureId ?? undefined,
          quantity: Math.max(0, Math.trunc(Number(quantity) || 0)),
          lowStockThreshold:
            lowStockThreshold.trim() === "" ? undefined : Math.max(0, Math.trunc(Number(lowStockThreshold))),
          locationId: locationId === "none" ? undefined : locationId,
        };
        if (consumable?.id) {
          await updateConsumable(consumable.id, input);
        } else {
          await createConsumable(input);
        }
        toast.success(consumable?.id ? "Consumable updated" : "Consumable created");
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{consumable?.id ? "Edit consumable" : "New consumable"}</DialogTitle>
          <DialogDescription>
            Identical stock items that get used up — track the product and how many are on hand.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="consumable-name">Name</Label>
              <Input
                id="consumable-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="consumable-category">Category</Label>
              <Input
                id="consumable-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Cleaning supplies"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Icon / picture</Label>
            <PictureIconEditor
              name={name || "Consumable"}
              icon={icon}
              onIconChange={setIcon}
              color={iconColor}
              onColorChange={setIconColor}
              pictureId={pictureId}
              onPictureChange={setPictureId}
              myPictures={myPictures}
              workspacePictures={workspacePictures}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="consumable-quantity">Quantity on hand</Label>
              <Input
                id="consumable-quantity"
                type="number"
                min={0}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="consumable-threshold">Low-stock threshold</Label>
              <Input
                id="consumable-threshold"
                type="number"
                min={0}
                step={1}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Location</Label>
            <Select value={locationId} onValueChange={(v) => setLocationId(v ?? "none")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No location">
                  {locationId === "none"
                    ? "No location"
                    : flatLocations.find((l) => l.id === locationId)?.label}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !name}>
            {consumable?.id ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
