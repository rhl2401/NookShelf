"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadSignInBackground, removeSignInBackground } from "@/lib/actions/workspace-settings";

export function SignInBackgroundControl({
  hasBackground,
  updatedAt,
}: {
  hasBackground: boolean;
  updatedAt: Date | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const url = hasBackground ? `/api/branding/sign-in-background?v=${updatedAt?.getTime()}` : null;

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
        await uploadSignInBackground(formData);
        toast.success("Sign-in background updated");
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
        await removeSignInBackground();
        toast.success("Sign-in background removed");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't remove");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Sign-in background"
          className="h-32 w-full rounded-lg border object-cover"
        />
      ) : (
        <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No background set
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChosen}
        />
        <Button type="button" size="sm" variant="outline" onClick={pickFile} disabled={isPending}>
          {url ? "Replace" : "Upload"}
        </Button>
        {url && (
          <Button
            type="button"
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
      <p className="text-xs text-muted-foreground">
        Shown full-screen behind the sign-in form, which moves into a centered box once a
        background is set. Leave unset to keep today&apos;s plain background.
      </p>
    </div>
  );
}
