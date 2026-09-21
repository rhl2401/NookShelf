"use client";

import { useEffect, useState, useTransition } from "react";
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
import { previewBackgroundRemovalForPicture, applyBackgroundRemoval } from "@/lib/actions/pictures";

/**
 * Removes the background of an ALREADY-SAVED library picture, in place —
 * unlike PictureUploadPreviewDialog (a new upload, nothing persisted until
 * confirmed), applying here replaces the picture's stored file for its
 * existing id, so every asset/asset type/kit/location using it picks up the
 * change immediately. Irreversible, so it's shown as a deliberate compare +
 * Apply step, never automatic.
 */
export function PictureBackgroundRemovalDialog({
  picture,
  onClose,
  onApplied,
}: {
  picture: { id: string; name: string | null } | null;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [removedPreview, setRemovedPreview] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, startPreview] = useTransition();
  const [applying, startApply] = useTransition();

  useEffect(() => {
    if (!picture) return;
    startPreview(async () => {
      try {
        const result = await previewBackgroundRemovalForPicture(picture.id);
        setRemovedPreview(result.removedDataUrl);
        setPreviewError(null);
        if (result.warning) toast.warning(result.warning);
      } catch (err) {
        setRemovedPreview(null);
        setPreviewError(err instanceof Error ? err.message : "Couldn't preview background removal");
      }
    });
  }, [picture, startPreview]);

  function apply() {
    if (!picture) return;
    startApply(async () => {
      try {
        await applyBackgroundRemoval(picture.id);
        toast.success("Background removed");
        onApplied();
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't remove background");
      }
    });
  }

  const busy = previewing || applying;

  return (
    <Dialog open={!!picture} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Remove background{picture?.name ? ` — ${picture.name}` : ""}</DialogTitle>
          <DialogDescription>
            Replaces this picture everywhere it&apos;s used — every asset, asset type, or kit with
            it as their photo picks up the change immediately. Can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {picture && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/pictures/${picture.id}`}
                  alt="Current"
                  className="max-h-full max-w-full object-contain"
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">Current</p>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="bg-transparency-grid flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border">
              {previewing && <p className="text-xs text-muted-foreground">Removing…</p>}
              {!previewing && removedPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={removedPreview}
                  alt="Background removed"
                  className="max-h-full max-w-full object-contain"
                />
              )}
              {!previewing && previewError && (
                <p className="px-2 text-center text-xs text-destructive">{previewError}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Background removed</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={busy || !removedPreview}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
