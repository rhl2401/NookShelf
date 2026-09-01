"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { AssetPicture } from "@/components/asset-picture";
import { PictureSearchPanel } from "@/components/pictures/picture-search-panel";
import type { PictureRef } from "@/components/pictures/picture-row";

/** Controlled value/onChange picture picker for use inside form dialogs (AssetType, Kit) — mirrors IconPicker. */
export function PicturePicker({
  value,
  onChange,
  myPictures,
  workspacePictures,
}: {
  value: string | null;
  onChange: (pictureId: string | null) => void;
  myPictures: PictureRef[];
  workspacePictures: PictureRef[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" className="h-auto w-full justify-between gap-2 py-1.5" />
        }
      >
        <span className="flex items-center gap-2">
          <AssetPicture pictureId={value} alt="" size="sm" />
          <span className="text-sm">{value ? "Picture selected" : "No picture"}</span>
        </span>
        <ChevronDown className="size-4 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-2 p-3">
        {value && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="self-start text-muted-foreground"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            Remove picture
          </Button>
        )}
        <PictureSearchPanel
          myPictures={myPictures}
          workspacePictures={workspacePictures}
          onSelect={(id) => {
            onChange(id);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
