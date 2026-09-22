"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

/**
 * Square-crops a picked file before it's uploaded as a profile picture —
 * without this, a non-1:1 photo would just get letterboxed onto a padded
 * square server-side (see processImageUpload's fit: "contain"), leaving
 * visible empty margins instead of a well-framed face.
 */
export function AvatarCropDialog({
  file,
  onClose,
  onCropped,
}: {
  file: File | null;
  onClose: () => void;
  onCropped: (cropped: File) => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  if (file && !imageUrl) {
    // Cheap enough to do at render time (no cleanup-ordering hazard like the
    // picture-upload dialog's object URL — see that component's comment for
    // why blob-URL create/revoke needs to stay inside one effect instance;
    // here there's nothing to revoke until the dialog closes, handled below).
    setImageUrl(URL.createObjectURL(file));
  }

  function reset() {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function confirm() {
    if (!file || !imageUrl || !croppedAreaPixels) return;
    try {
      const blob = await cropToSquareBlob(imageUrl, croppedAreaPixels);
      const cropped = new File([blob], file.name, { type: "image/png" });
      onCropped(cropped);
      handleClose();
    } catch {
      toast.error("Couldn't crop that image");
    }
  }

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crop profile picture</DialogTitle>
          <DialogDescription>Drag to reposition, use the slider to zoom.</DialogDescription>
        </DialogHeader>

        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-muted">
          {imageUrl && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <Slider
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onValueChange={(v) => setZoom(v as number)}
        />

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={!croppedAreaPixels}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function cropToSquareBlob(imageUrl: string, area: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = area.width;
      canvas.height = area.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Couldn't export the crop"));
      }, "image/png");
    };
    img.onerror = () => reject(new Error("Couldn't load the image"));
    img.src = imageUrl;
  });
}
