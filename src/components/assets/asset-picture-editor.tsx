"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
import { PictureSearchPanel } from "@/components/pictures/picture-search-panel";
import type { PictureRef } from "@/components/pictures/picture-row";
import { setAssetIcon } from "@/lib/actions/assets";
import { applyExistingPicture, removePictureFromAsset } from "@/lib/actions/pictures";
import { cn } from "@/lib/utils";

export function AssetPictureEditor({
  assetId,
  name,
  icon,
  color,
  typeIcon,
  typeColor,
  pictureId,
  myPictures,
  workspacePictures,
}: {
  assetId: string;
  name: string;
  icon: string | null;
  color: string | null;
  typeIcon: string | null;
  typeColor: string | null;
  pictureId: string | null;
  myPictures: PictureRef[];
  workspacePictures: PictureRef[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const hasPicture = Boolean(pictureId || icon || typeIcon);

  function usePicture(id: string) {
    startTransition(async () => {
      try {
        await applyExistingPicture(assetId, id);
        toast.success("Photo updated");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't set picture");
      }
    });
  }

  function removePhoto() {
    startTransition(async () => {
      try {
        await removePictureFromAsset(assetId);
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
              pictureId={pictureId}
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
          <div className="flex items-center justify-between">
            <Label>Photo</Label>
            <Link href="/pictures" className="text-xs text-muted-foreground hover:underline">
              Manage pictures
            </Link>
          </div>
          {pictureId && (
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
          <PictureSearchPanel
            myPictures={myPictures}
            workspacePictures={workspacePictures}
            onSelect={usePicture}
            disabled={isPending}
          />
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
