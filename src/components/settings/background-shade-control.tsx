"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BackgroundShadeSwatches } from "@/components/appearance/background-shade-swatches";
import type { BackgroundShadeKey } from "@/lib/background-shades";
import { setWorkspaceDefaultBackgroundShade } from "@/lib/actions/workspace-settings";

export function BackgroundShadeControl({ shade }: { shade: BackgroundShadeKey }) {
  const [value, setValue] = useState<BackgroundShadeKey>(shade);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const dirty = value !== shade;

  function save() {
    startTransition(async () => {
      try {
        await setWorkspaceDefaultBackgroundShade(value);
        toast.success("Default background updated");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update background");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <BackgroundShadeSwatches value={value} onSelect={(key) => key && setValue(key)} />
      <p className="text-xs text-muted-foreground">
        Applies to anyone who hasn&apos;t picked their own background from their avatar menu.
      </p>
      <Button size="sm" className="self-start" onClick={save} disabled={!dirty || isPending}>
        Save
      </Button>
    </div>
  );
}
