"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Pencil, Trash2, Upload } from "lucide-react";
import { uploadAttachment, deleteAttachment, renameAttachment } from "@/lib/actions/assets";

type AttachmentDto = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  kind: string;
};

export function AttachmentsPanel({
  assetId,
  attachments,
  canManage,
}: {
  assetId: string;
  attachments: AttachmentDto[];
  canManage: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const router = useRouter();

  function upload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      try {
        await uploadAttachment(assetId, formData);
        toast.success("Uploaded");
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      try {
        await deleteAttachment(id);
        toast.success("Deleted");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't delete");
      }
    });
  }

  function startEditing(a: AttachmentDto) {
    setEditingId(a.id);
    setDraft(a.originalName);
  }

  function commitRename(id: string, originalName: string) {
    const trimmed = draft.trim();
    setEditingId(null);
    if (!trimmed || trimmed === originalName) return;
    startTransition(async () => {
      try {
        await renameAttachment(id, trimmed);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't rename");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {attachments.map((a) => (
        <div key={a.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
          {editingId === a.id ? (
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => commitRename(a.id, a.originalName)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename(a.id, a.originalName);
                if (e.key === "Escape") setEditingId(null);
              }}
              className="h-7 flex-1"
            />
          ) : (
            <a
              href={`/api/attachments/${a.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 truncate hover:underline"
            >
              <Paperclip className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{a.originalName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {(a.sizeBytes / 1024).toFixed(0)} KB
              </span>
            </a>
          )}
          {canManage && editingId !== a.id && (
            <div className="flex shrink-0 items-center">
              <Button
                variant="ghost"
                size="icon"
                title="Rename"
                onClick={() => startEditing(a)}
                disabled={isPending}
              >
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(a.id)} disabled={isPending}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        </div>
      ))}
      {attachments.length === 0 && (
        <p className="text-sm text-muted-foreground">No files yet.</p>
      )}

      {canManage && (
        <div className="flex items-center gap-2 pt-1">
          <input ref={fileInputRef} type="file" className="text-sm" />
          <Button size="sm" variant="outline" onClick={upload} disabled={isPending}>
            <Upload className="size-3.5" /> Upload
          </Button>
        </div>
      )}
    </div>
  );
}
