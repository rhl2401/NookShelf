"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { uploadAvatar, removeAvatar } from "@/lib/actions/people";

export function AvatarUploader({
  personId,
  name,
  hasAvatar,
}: {
  personId: string;
  name: string;
  hasAvatar: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
        await uploadAvatar(personId, formData);
        toast.success("Profile picture updated");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  function onRemove() {
    startTransition(async () => {
      try {
        await removeAvatar(personId);
        toast.success("Profile picture removed");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't remove");
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg" className="size-16">
        {hasAvatar && <AvatarImage src={`/api/avatars/${personId}`} alt={name} />}
        <AvatarFallback className="text-base">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChosen}
        />
        <Button size="sm" variant="outline" onClick={pickFile} disabled={isPending}>
          Upload photo
        </Button>
        {hasAvatar && (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={onRemove}
            disabled={isPending}
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
