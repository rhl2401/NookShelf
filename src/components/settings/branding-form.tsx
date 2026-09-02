"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Boxes, Pencil } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { IconGrid } from "@/components/icon-grid";
import { AssetTypeIcon } from "@/components/asset-type-icon";
import { ColorSwatches } from "@/components/color-swatches";
import {
  uploadLogo,
  removeLogo,
  setWorkspaceIcon,
  setWorkspaceBranding,
} from "@/lib/actions/workspace-settings";
import { DEFAULT_APP_NAME, DEFAULT_SIGN_IN_SUBTITLE } from "@/lib/branding-shared";
import { ICON_COLOR_HEX, hexToIconColorKey, isValidHexColor } from "@/lib/color-shared";

function BrandingIconEditor({
  appName,
  logoUrl,
  icon,
  iconColor,
}: {
  appName: string;
  logoUrl: string | null;
  icon: string | null;
  iconColor: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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
        await uploadLogo(formData);
        toast.success("Logo updated");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  function onRemoveLogo() {
    startTransition(async () => {
      try {
        await removeLogo();
        toast.success("Logo removed");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't remove logo");
      }
    });
  }

  function pickIcon(nextIcon: string | null) {
    startTransition(async () => {
      try {
        await setWorkspaceIcon({ icon: nextIcon });
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update icon");
      }
    });
  }

  function pickColor(nextColor: string | null) {
    startTransition(async () => {
      try {
        await setWorkspaceIcon({ iconColor: nextColor });
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update color");
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="group relative block shrink-0 rounded-xl outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          />
        }
      >
        {logoUrl ? (
          <div className="flex size-16 items-center justify-center overflow-hidden rounded-xl border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={appName} className="max-h-full max-w-full object-contain" />
          </div>
        ) : icon ? (
          <AssetTypeIcon icon={icon} color={iconColor} size="lg" />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-xl border bg-muted">
            <Boxes className="size-6 text-muted-foreground" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-foreground/0 opacity-0 transition group-hover:bg-foreground/50 group-hover:opacity-100">
          <Pencil className="size-4 text-background" />
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-3 p-3">
        <div className="flex flex-col gap-1.5">
          <Label>Logo</Label>
          {logoUrl && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="self-start text-muted-foreground"
              onClick={onRemoveLogo}
              disabled={isPending}
            >
              Remove logo
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChosen}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="self-start"
            onClick={pickFile}
            disabled={isPending}
          >
            Upload logo
          </Button>
        </div>

        <Separator />

        <div className="flex flex-col gap-1.5">
          <Label>Icon</Label>
          <p className="text-xs text-muted-foreground">
            Used when there&apos;s no logo — pick one from the library instead of uploading an
            image.
          </p>
          <IconGrid value={icon} onSelect={pickIcon} color={iconColor} onColorChange={pickColor} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function BrandingForm({
  appName,
  logoUrl,
  icon,
  iconColor,
  color,
  signInHeadline,
  signInSubtitle,
}: {
  appName: string | null;
  logoUrl: string | null;
  icon: string | null;
  iconColor: string | null;
  color: string | null;
  signInHeadline: string | null;
  signInSubtitle: string | null;
}) {
  const [name, setName] = useState(appName ?? "");
  const [accent, setAccent] = useState(color ?? "");
  const [headline, setHeadline] = useState(signInHeadline ?? "");
  const [subtitle, setSubtitle] = useState(signInSubtitle ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const accentInvalid = accent.trim() !== "" && !isValidHexColor(accent.trim());
  const dirty =
    name !== (appName ?? "") ||
    accent !== (color ?? "") ||
    headline !== (signInHeadline ?? "") ||
    subtitle !== (signInSubtitle ?? "");

  function save() {
    if (accentInvalid) {
      toast.error("Workspace colour must be a hex value like #3b82f6.");
      return;
    }
    startTransition(async () => {
      try {
        await setWorkspaceBranding({
          appName: name.trim() || null,
          color: accent.trim() || null,
          signInHeadline: headline.trim() || null,
          signInSubtitle: subtitle.trim() || null,
        });
        toast.success("Branding updated");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't save");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <BrandingIconEditor
          appName={name.trim() || DEFAULT_APP_NAME}
          logoUrl={logoUrl}
          icon={icon}
          iconColor={iconColor}
        />
        <p className="text-xs text-muted-foreground">
          A logo takes precedence over the icon. Click to change either.
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label>Workspace colour</Label>
        <p className="text-xs text-muted-foreground">
          The app stays monochrome otherwise — this is the one accent, used for primary buttons
          and focus rings.
        </p>
        <ColorSwatches
          value={hexToIconColorKey(accent.trim() || null)}
          onSelect={(key) => setAccent(key ? ICON_COLOR_HEX[key] : "")}
        />
        <div className="flex items-center gap-2">
          <span
            className="size-6 shrink-0 rounded-full border"
            style={{ backgroundColor: isValidHexColor(accent.trim()) ? accent.trim() : undefined }}
          />
          <Input
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            placeholder="#3b82f6"
            aria-invalid={accentInvalid}
            className="w-36 font-mono"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="branding-app-name">App name</Label>
        <Input
          id="branding-app-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={DEFAULT_APP_NAME}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="branding-headline">Sign-in headline</Label>
        <Input
          id="branding-headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder={name.trim() || DEFAULT_APP_NAME}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="branding-subtitle">Sign-in subtitle</Label>
        <Textarea
          id="branding-subtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder={DEFAULT_SIGN_IN_SUBTITLE}
          rows={2}
        />
      </div>

      <Button size="sm" className="self-start" onClick={save} disabled={!dirty || isPending}>
        Save
      </Button>
    </div>
  );
}
