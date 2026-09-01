"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { IconGrid } from "@/components/icon-grid";
import { AssetPicture } from "@/components/asset-picture";
import { setAssetIcon, setAssetPrimaryPhoto, removeAssetPrimaryPhoto } from "@/lib/actions/assets";

export function AssetPictureEditor({
  assetId,
  name,
  icon,
  typeIcon,
  photoAttachmentId,
}: {
  assetId: string;
  name: string;
  icon: string | null;
  typeIcon: string | null;
  photoAttachmentId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function uploadPhoto() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      try {
        await setAssetPrimaryPhoto(assetId, formData);
        toast.success("Photo updated");
        if (fileInputRef.current) fileInputRef.current.value = "";
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  function removePhoto() {
    startTransition(async () => {
      try {
        await removeAssetPrimaryPhoto(assetId);
        toast.success("Photo removed");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't remove photo");
      }
    });
  }

  function pickIcon(nextIcon: string | null) {
    startTransition(async () => {
      try {
        await setAssetIcon(assetId, nextIcon);
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update icon");
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="rounded-2xl outline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          />
        }
      >
        <AssetPicture
          photoAttachmentId={photoAttachmentId}
          icon={icon}
          typeIcon={typeIcon}
          alt={name}
          size="xl"
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-3 p-3">
        <div className="flex flex-col gap-1.5">
          <Label>Photo</Label>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="min-w-0 flex-1 text-xs" />
            <Button size="sm" variant="outline" onClick={uploadPhoto} disabled={isPending}>
              Upload
            </Button>
          </div>
          {photoAttachmentId && (
            <Button
              size="sm"
              variant="ghost"
              className="self-start text-muted-foreground"
              onClick={removePhoto}
              disabled={isPending}
            >
              Remove photo
            </Button>
          )}
        </div>

        <Separator />

        <div className="flex flex-col gap-1.5">
          <Label>Icon</Label>
          <p className="text-xs text-muted-foreground">
            Used when there&apos;s no photo. Leave unset to use the asset type&apos;s icon.
          </p>
          <IconGrid value={icon} onSelect={pickIcon} noIconLabel="Use type's icon" />
        </div>
      </PopoverContent>
    </Popover>
  );
}
