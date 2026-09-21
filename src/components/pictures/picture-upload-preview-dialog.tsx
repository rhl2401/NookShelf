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
import { previewBackgroundRemoval, uploadPicture, uploadPictureFromUrl } from "@/lib/actions/pictures";

export type PictureUploadSource = { kind: "file"; file: File } | { kind: "url"; url: string };

/**
 * Shown after picking a file or pasting an image URL, before it's saved —
 * lets the user compare the original against a background-removed preview
 * and pick either, or skip it entirely. Nothing is persisted until they
 * confirm; Cancel is a true no-op (previewBackgroundRemoval never saves
 * anything).
 */
export function PictureUploadPreviewDialog({
  source,
  scope,
  onClose,
  onUploaded,
}: {
  source: PictureUploadSource | null;
  scope: "PERSONAL" | "WORKSPACE";
  onClose: () => void;
  onUploaded: (picture: { id: string }) => void;
}) {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [removedPreview, setRemovedPreview] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, startPreview] = useTransition();
  const [uploading, startUpload] = useTransition();

  // A file gets an instant local preview via a blob: URL (allowed by the
  // app's img-src CSP). A pasted external URL can't be hotlinked directly —
  // img-src only allows 'self'/blob:/data: — so its "original" side instead
  // comes back from the server as a data URL alongside the background-removed
  // preview, in the effect below.
  //
  // The object URL is created and revoked by this SAME effect instance — not
  // created in a useMemo and revoked by a separate cleanup-only effect, which
  // briefly broke the preview: React's dev-mode Strict Mode double-invoke
  // (mount → cleanup → mount) revoked the one memoized URL without anything
  // re-creating it, leaving the <img> pointed at a dead blob: URL.
  /* eslint-disable react-hooks/set-state-in-effect -- synchronizing with the
     browser's object-URL lifecycle (React docs' "connecting to an external
     system" pattern) requires setting state directly in this effect. */
  useEffect(() => {
    if (!source || source.kind !== "file") {
      setOriginalUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(source.file);
    setOriginalUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [source]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!source) return;
    startPreview(async () => {
      try {
        const formData = new FormData();
        if (source.kind === "file") formData.set("file", source.file);
        else formData.set("url", source.url);
        const result = await previewBackgroundRemoval(formData);
        if (source.kind === "url") setOriginalUrl(result.originalDataUrl);
        setRemovedPreview(result.removedDataUrl);
        setPreviewError(null);
        if (result.warning) toast.warning(result.warning);
      } catch (err) {
        setRemovedPreview(null);
        setPreviewError(err instanceof Error ? err.message : "Couldn't preview background removal");
      }
    });
  }, [source, startPreview]);

  function confirm(removeBg: boolean) {
    if (!source) return;
    startUpload(async () => {
      try {
        const picture =
          source.kind === "file"
            ? await uploadPicture(withFile(source.file), scope, removeBg)
            : await uploadPictureFromUrl(source.url, scope, removeBg);
        onUploaded(picture);
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  const busy = previewing || uploading;

  return (
    <Dialog open={!!source} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Remove background?</DialogTitle>
          <DialogDescription>
            Optional — compare the original against a background-removed version and pick
            whichever looks better.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {originalUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={originalUrl} alt="Original" className="max-h-full max-w-full object-contain" />
              ) : (
                previewing && <p className="text-xs text-muted-foreground">Loading…</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Original</p>
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
          <Button variant="outline" onClick={() => confirm(false)} disabled={busy}>
            Use original
          </Button>
          <Button onClick={() => confirm(true)} disabled={busy || !removedPreview}>
            Use without background
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function withFile(file: File): FormData {
  const formData = new FormData();
  formData.set("file", file);
  return formData;
}
