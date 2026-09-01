"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Upload, Trash2, Share2, Undo2, Sparkles, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  uploadPicture,
  deletePicture,
  shareToWorkspace,
  unshareFromWorkspace,
  renamePicture,
  flushUnusedPictures,
} from "@/lib/actions/pictures";

type PictureItem = { id: string; name: string | null; usedCount: number; ownerName?: string | null };

export function PicturesManager({
  myPictures,
  myTotal,
  workspacePictures,
  workspaceTotal,
  canShare,
  pageSize,
}: {
  myPictures: PictureItem[];
  myTotal: number;
  workspacePictures: PictureItem[];
  workspaceTotal: number;
  canShare: boolean;
  pageSize: number;
}) {
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const unusedCount = myPictures.filter((p) => p.usedCount === 0).length;

  function setSearch(value: string) {
    setQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("q", value);
    else params.delete("q");
    router.push(`${pathname}?${params.toString()}`);
  }

  function pickFile() {
    fileInputRef.current?.click();
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      try {
        await uploadPicture(formData, "PERSONAL");
        toast.success("Picture added");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  function onDelete(picture: PictureItem) {
    const warning =
      picture.usedCount > 0
        ? `This picture is used on ${picture.usedCount} asset(s). Delete it anyway? Those assets will fall back to their icon.`
        : "Delete this picture?";
    if (!confirm(warning)) return;
    startTransition(async () => {
      try {
        await deletePicture(picture.id);
        toast.success("Picture deleted");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't delete");
      }
    });
  }

  function onShare(id: string) {
    startTransition(async () => {
      try {
        await shareToWorkspace(id);
        toast.success("Shared to workspace");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't share");
      }
    });
  }

  function onUnshare(id: string) {
    startTransition(async () => {
      try {
        await unshareFromWorkspace(id);
        toast.success("Removed from workspace");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't remove from workspace");
      }
    });
  }

  function onRename(id: string, name: string) {
    startTransition(async () => {
      try {
        await renamePicture(id, name);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't rename");
      }
    });
  }

  function onFlush() {
    startTransition(async () => {
      try {
        const count = await flushUnusedPictures();
        toast.success(count > 0 ? `Removed ${count} unused picture(s)` : "Nothing to flush");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't flush");
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="relative w-64">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name…"
          value={query}
          className="pl-8"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">My pictures</h2>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChosen}
            />
            <Button size="sm" variant="outline" onClick={onFlush} disabled={isPending || unusedCount === 0}>
              <Sparkles className="size-3.5" /> Flush unused {unusedCount > 0 && `(${unusedCount})`}
            </Button>
            <Button size="sm" onClick={pickFile} disabled={isPending}>
              <Upload className="size-3.5" /> Upload
            </Button>
          </div>
        </div>

        {myPictures.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {query
              ? "No pictures match that search."
              : "No pictures yet — upload one here, or from any asset's picture editor."}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
              {myPictures.map((p) => (
                <PictureCard
                  key={p.id}
                  picture={p}
                  isPending={isPending}
                  onDelete={() => onDelete(p)}
                  onShare={canShare ? () => onShare(p.id) : undefined}
                  onRename={(name) => onRename(p.id, name)}
                />
              ))}
            </div>
            {myTotal > pageSize && (
              <p className="text-xs text-muted-foreground">
                Showing the {pageSize} most recent of {myTotal} — refine your search to find older ones.
              </p>
            )}
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Workspace pictures</h2>
        {workspacePictures.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {query
              ? "No shared pictures match that search."
              : `No shared pictures yet. ${canShare ? "Share one of your pictures above to add it here." : ""}`}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
              {workspacePictures.map((p) => (
                <PictureCard
                  key={p.id}
                  picture={p}
                  isPending={isPending}
                  onDelete={canShare ? () => onDelete(p) : undefined}
                  onUnshare={canShare && p.usedCount === 0 ? () => onUnshare(p.id) : undefined}
                  onRename={canShare ? (name) => onRename(p.id, name) : undefined}
                />
              ))}
            </div>
            {workspaceTotal > pageSize && (
              <p className="text-xs text-muted-foreground">
                Showing the {pageSize} most recent of {workspaceTotal} — refine your search to find
                older ones.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function PictureCard({
  picture,
  isPending,
  onDelete,
  onShare,
  onUnshare,
  onRename,
}: {
  picture: PictureItem;
  isPending: boolean;
  onDelete?: () => void;
  onShare?: () => void;
  onUnshare?: () => void;
  onRename?: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(picture.name ?? "");

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== (picture.name ?? "")) onRename?.(trimmed);
  }

  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/pictures/${picture.id}?size=thumb`}
          alt={picture.name ?? ""}
          className="size-full object-cover"
        />
      </div>
      <div className="mt-1 flex flex-col gap-0.5">
        {editing ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(picture.name ?? "");
                setEditing(false);
              }
            }}
            className="h-6 text-xs"
          />
        ) : (
          <button
            type="button"
            className="flex items-center gap-1 truncate text-left text-xs font-medium hover:underline disabled:pointer-events-none disabled:no-underline"
            title={onRename ? "Rename" : undefined}
            disabled={!onRename}
            onClick={() => onRename && setEditing(true)}
          >
            <span className="truncate">{picture.name || "Untitled"}</span>
            {onRename && <Pencil className="size-2.5 shrink-0 text-muted-foreground" />}
          </button>
        )}
        <div className="flex items-center justify-between gap-1">
          <div className="flex flex-col">
            {picture.usedCount > 0 && (
              <Badge variant="outline" className="w-fit text-[10px]">
                {picture.usedCount} in use
              </Badge>
            )}
            {picture.ownerName && (
              <span className="truncate text-[10px] text-muted-foreground">{picture.ownerName}</span>
            )}
          </div>
          <div className="flex shrink-0 gap-0.5">
            {onShare && (
              <Button
                size="icon"
                variant="ghost"
                className="size-6"
                title="Share to workspace"
                onClick={onShare}
                disabled={isPending}
              >
                <Share2 className="size-3.5" />
              </Button>
            )}
            {onUnshare && (
              <Button
                size="icon"
                variant="ghost"
                className="size-6"
                title="Remove from workspace"
                onClick={onUnshare}
                disabled={isPending}
              >
                <Undo2 className="size-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                className="size-6 text-destructive"
                title="Delete"
                onClick={onDelete}
                disabled={isPending}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
