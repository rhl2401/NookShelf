"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PictureRow, type PictureRef } from "@/components/pictures/picture-row";
import { uploadPicture, searchPictures } from "@/lib/actions/pictures";

/**
 * Upload-new + search-across-your-and-workspace-pictures body, shared by the
 * asset detail hero editor and the draft-state PictureIconEditor used in form
 * dialogs. `onSelect` fires both when an existing picture is clicked and
 * when a fresh upload finishes — the caller decides what "selected" means
 * (apply immediately, or just update local draft state).
 */
export function PictureSearchPanel({
  myPictures,
  workspacePictures,
  onSelect,
  disabled = false,
}: {
  myPictures: PictureRef[];
  workspacePictures: PictureRef[];
  onSelect: (pictureId: string) => void;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [query, setQuery] = useState("");
  const [searching, startSearchTransition] = useTransition();
  const [results, setResults] = useState<{ mine: PictureRef[]; workspace: PictureRef[] } | null>(
    null,
  );

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const timer = setTimeout(() => {
      startSearchTransition(async () => {
        try {
          setResults(await searchPictures(q));
        } catch {
          setResults({ mine: [], workspace: [] });
        }
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const shownMine = query.trim() ? (results?.mine ?? []) : myPictures;
  const shownWorkspace = query.trim() ? (results?.workspace ?? []) : workspacePictures;

  function pickFile() {
    fileInputRef.current?.click();
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    startUpload(async () => {
      try {
        const picture = await uploadPicture(formData, "PERSONAL");
        onSelect(picture.id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  const busy = disabled || uploading;

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChosen}
      />
      <Button type="button" size="sm" variant="outline" className="self-start" onClick={pickFile} disabled={busy}>
        Upload new
      </Button>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search pictures…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 pl-7 text-xs"
        />
      </div>

      {query.trim() && !searching && shownMine.length === 0 && shownWorkspace.length === 0 ? (
        <p className="text-xs text-muted-foreground">No pictures match &ldquo;{query}&rdquo;.</p>
      ) : (
        <>
          <PictureRow label="Your pictures" pictures={shownMine} onPick={onSelect} disabled={busy} />
          <PictureRow label="Workspace" pictures={shownWorkspace} onPick={onSelect} disabled={busy} />
        </>
      )}
    </div>
  );
}
