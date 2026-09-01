"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, Pencil } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { IconGrid } from "@/components/icon-grid";
import { AssetPicture } from "@/components/asset-picture";
import { PICTURE_CONTAINER_SIZE } from "@/components/asset-type-icon";
import { setAssetIcon, setAssetPrimaryPhoto, removeAssetPrimaryPhoto } from "@/lib/actions/assets";
import { cn } from "@/lib/utils";

export function AssetPictureEditor({
  assetId,
  name,
  icon,
  color,
  typeIcon,
  typeColor,
  photoAttachmentId,
}: {
  assetId: string;
  name: string;
  icon: string | null;
  color: string | null;
  typeIcon: string | null;
  typeColor: string | null;
  photoAttachmentId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const hasPicture = Boolean(photoAttachmentId || icon || typeIcon);

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
        await setAssetIcon(assetId, { icon: nextIcon });
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update icon");
      }
    });
  }

  function pickColor(nextColor: string | null) {
    startTransition(async () => {
      try {
        await setAssetIcon(assetId, { iconColor: nextColor });
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update color");
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="group relative rounded-2xl outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          />
        }
      >
        {hasPicture ? (
          <>
            <AssetPicture
              photoAttachmentId={photoAttachmentId}
              icon={icon}
              color={color}
              typeIcon={typeIcon}
              typeColor={typeColor}
              alt={name}
              size="xl"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-foreground/0 opacity-0 transition group-hover:bg-foreground/50 group-hover:opacity-100">
              <Pencil className="size-5 text-background" />
            </div>
          </>
        ) : (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-1 border border-muted-foreground/20 bg-muted text-center transition-colors group-hover:bg-muted-foreground/15",
              PICTURE_CONTAINER_SIZE.xl,
            )}
          >
            <ImagePlus className="size-5 text-muted-foreground" />
            <span className="px-1 text-[9px] leading-tight font-medium text-muted-foreground">
              Add icon /
              <br />
              picture
            </span>
          </div>
        )}
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
          <IconGrid
            value={icon}
            onSelect={pickIcon}
            noIconLabel="Use type's icon"
            color={color}
            onColorChange={pickColor}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
