"use client";

import { useState } from "react";
import Link from "next/link";
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
import { cn } from "@/lib/utils";

/**
 * Controlled icon+picture editor for use inside draft-state form dialogs
 * (AssetType, Kit) — same combined single-popover layout as AssetPictureEditor
 * (Photo section, then Icon section), but holds draft value/onChange state
 * instead of persisting immediately, since the entity may not exist yet
 * (create flow) or the dialog has its own Save button.
 */
export function PictureIconEditor({
  name,
  icon,
  onIconChange,
  color,
  onColorChange,
  pictureId,
  onPictureChange,
  myPictures,
  workspacePictures,
}: {
  name: string;
  icon: string | null;
  onIconChange: (icon: string | null) => void;
  color: string | null;
  onColorChange: (color: string | null) => void;
  pictureId: string | null;
  onPictureChange: (pictureId: string | null) => void;
  myPictures: PictureRef[];
  workspacePictures: PictureRef[];
}) {
  const [open, setOpen] = useState(false);
  const hasPicture = Boolean(pictureId || icon);

  function pickPicture(id: string) {
    onPictureChange(id);
    setOpen(false);
  }

  function pickIcon(nextIcon: string | null) {
    onIconChange(nextIcon);
    setOpen(false);
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
            <AssetPicture pictureId={pictureId} icon={icon} color={color} alt={name} size="xl" />
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
              type="button"
              size="sm"
              variant="ghost"
              className="self-start text-muted-foreground"
              onClick={() => onPictureChange(null)}
            >
              Remove photo
            </Button>
          )}
          <PictureSearchPanel
            myPictures={myPictures}
            workspacePictures={workspacePictures}
            onSelect={pickPicture}
          />
        </div>

        <Separator />

        <div className="flex flex-col gap-1.5">
          <Label>Icon</Label>
          <IconGrid value={icon} onSelect={pickIcon} color={color} onColorChange={onColorChange} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
