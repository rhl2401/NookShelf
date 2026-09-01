"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PICTURE_SIZE_OPTIONS } from "@/lib/picture-size";
import { setWorkspacePictureSize } from "@/lib/actions/workspace-settings";

export function PictureSizeControl({ pictureSize }: { pictureSize: number }) {
  const savedIndex = Math.max(0, PICTURE_SIZE_OPTIONS.indexOf(pictureSize as never));
  const [index, setIndex] = useState(savedIndex);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const dirty = index !== savedIndex;

  function save() {
    const size = PICTURE_SIZE_OPTIONS[index];
    startTransition(async () => {
      try {
        await setWorkspacePictureSize(size);
        toast.success(`Picture size set to ${size}px`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update picture size");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Large picture size</span>
        <span className="font-mono text-sm font-medium">{PICTURE_SIZE_OPTIONS[index]}px</span>
      </div>
      <Slider
        min={0}
        max={PICTURE_SIZE_OPTIONS.length - 1}
        step={1}
        value={index}
        onValueChange={(v) => setIndex(v as number)}
        disabled={isPending}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        {PICTURE_SIZE_OPTIONS.map((size) => (
          <span key={size}>{size}</span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Applies to new uploads to the picture library (used by assets, asset types, and kits).
        Every picture is also always saved at a fixed 64px for lists and pickers, regardless of
        this setting.
      </p>
      <Button size="sm" className="self-start" onClick={save} disabled={!dirty || isPending}>
        Save
      </Button>
    </div>
  );
}
