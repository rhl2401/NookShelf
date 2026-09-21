"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setWorkspaceBgRemoval } from "@/lib/actions/workspace-settings";
import { BG_REMOVAL_PROVIDERS, type BgRemovalProvider } from "@/lib/background-removal-shared";

export function BgRemovalControl({
  provider,
  hasApiKey,
}: {
  provider: BgRemovalProvider;
  hasApiKey: boolean;
}) {
  const [selected, setSelected] = useState<BgRemovalProvider>(provider);
  const [apiKey, setApiKey] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const dirty = selected !== provider || apiKey.trim() !== "";

  function save() {
    startTransition(async () => {
      try {
        await setWorkspaceBgRemoval({
          provider: selected,
          apiKey: apiKey.trim() ? apiKey.trim() : undefined,
        });
        toast.success("Background removal settings updated");
        setApiKey("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update background removal settings");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-1.5">
        <Label>Provider</Label>
        <Select value={selected} onValueChange={(v) => v && setSelected(v as BgRemovalProvider)}>
          <SelectTrigger className="w-56">
            <SelectValue>
              {(v: string) => BG_REMOVAL_PROVIDERS.find((p) => p.value === v)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {BG_REMOVAL_PROVIDERS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected !== "local" && (
        <div className="grid gap-1.5">
          <Label htmlFor="bg-removal-api-key">API key</Label>
          <Input
            id="bg-removal-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasApiKey ? "•••••••••••• (leave blank to keep current)" : "Enter API key"}
            className="max-w-xs"
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Used when someone chooses to remove a picture&apos;s background at upload time (always
        optional — they can compare and skip it per image). &ldquo;Local&rdquo; clears near-white
        backgrounds in-process, free, and works well on solid light backgrounds only. remove.bg
        handles any background but costs money per image and sends the photo to a third party —
        get a key at{" "}
        <a
          href="https://www.remove.bg/api"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          remove.bg/api
        </a>
        .
      </p>

      <Button size="sm" className="self-start" onClick={save} disabled={!dirty || isPending}>
        Save
      </Button>
    </div>
  );
}
