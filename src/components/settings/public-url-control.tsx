"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setWorkspacePublicUrl } from "@/lib/actions/workspace-settings";

export function PublicUrlControl({ publicUrl }: { publicUrl: string | null }) {
  const [value, setValue] = useState(publicUrl ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const dirty = value.trim() !== (publicUrl ?? "");

  function save() {
    startTransition(async () => {
      try {
        await setWorkspacePublicUrl(value.trim() || null);
        toast.success("Public URL updated");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update public URL");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="https://assets.example.com"
        className="font-mono"
      />
      <p className="text-xs text-muted-foreground">
        The address printed on QR codes and asset labels. Leave blank to use whatever host the
        request came in on — behind a reverse proxy, or when the app is bound to 0.0.0.0, that can
        resolve to an internal address instead of your real domain, so QR codes won&apos;t scan
        correctly for anyone outside the container. Set this to your real, externally-reachable
        URL to fix that.
      </p>
      <Button size="sm" className="self-start" onClick={save} disabled={!dirty || isPending}>
        Save
      </Button>
    </div>
  );
}
