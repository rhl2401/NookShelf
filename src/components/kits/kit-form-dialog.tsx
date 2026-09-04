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
import { Textarea } from "@/components/ui/textarea";
import { DialogTriggerButton } from "@/components/dialog-trigger-button";
import { AssetPicker, type PickableAsset } from "@/components/kits/asset-picker";
import { PictureIconEditor } from "@/components/pictures/picture-icon-editor";
import type { PictureRef } from "@/components/pictures/picture-row";
import { createKit, updateKit } from "@/lib/actions/kits";

export function KitFormDialog({
  trigger,
  assets,
  kit,
  myPictures,
  workspacePictures,
}: {
  trigger: React.ReactElement;
  assets: PickableAsset[];
  kit?: {
    id: string;
    name: string;
    description: string | null;
    icon?: string | null;
    iconColor?: string | null;
    primaryPictureId?: string | null;
    assetIds: string[];
  };
  myPictures: PictureRef[];
  workspacePictures: PictureRef[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(kit?.name ?? "");
  const [description, setDescription] = useState(kit?.description ?? "");
  const [icon, setIcon] = useState<string | null>(kit?.icon ?? null);
  const [iconColor, setIconColor] = useState<string | null>(kit?.iconColor ?? null);
  const [pictureId, setPictureId] = useState<string | null>(kit?.primaryPictureId ?? null);
  const [selected, setSelected] = useState<Set<string>>(new Set(kit?.assetIds ?? []));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      try {
        const input = {
          name,
          description,
          icon: icon ?? undefined,
          iconColor: iconColor ?? undefined,
          primaryPictureId: pictureId ?? undefined,
          assetIds: Array.from(selected),
        };
        if (kit?.id) {
          await updateKit(kit.id, input);
        } else {
          await createKit(input);
        }
        toast.success(kit?.id ? "Kit updated" : "Kit created");
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
          <DialogTitle>{kit?.id ? "Edit kit" : "New kit"}</DialogTitle>
          <DialogDescription>
            A kit is a reusable bundle of assets you check out together — a travel bag, a video
            rig, anything you assemble more than once.
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid gap-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid gap-1.5">
            <PictureIconEditor
              label="Icon / picture"
              name={name || "Kit"}
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
          <div className="grid gap-1.5">
            <Label>Assets in this kit</Label>
            <AssetPicker assets={assets} selected={selected} onChange={setSelected} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !name}>
            {kit?.id ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
