"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import { AvatarUploader } from "@/components/settings/avatar-uploader";
import { EmailPrefToggle } from "@/components/settings/email-pref-toggle";
import { BackgroundShadeSwatches } from "@/components/appearance/background-shade-swatches";
import type { BackgroundShadeKey } from "@/lib/background-shades";
import { setMyBackgroundShade } from "@/lib/actions/appearance";

export function ProfileSettingsDialog({
  open,
  onOpenChange,
  personId,
  name,
  hasAvatar,
  oauthImage,
  emailNotificationsEnabled,
  backgroundShade,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
  name: string;
  hasAvatar: boolean;
  oauthImage?: string | null;
  emailNotificationsEnabled: boolean;
  backgroundShade: BackgroundShadeKey | null;
}) {
  const [shade, setShade] = useState(backgroundShade);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function pickShade(key: BackgroundShadeKey | null) {
    setShade(key);
    startTransition(async () => {
      try {
        await setMyBackgroundShade(key);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update background");
        setShade(backgroundShade);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Profile settings</DialogTitle>
          <DialogDescription>Your picture, notifications, and background.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label>Profile picture</Label>
            <AvatarUploader
              personId={personId}
              name={name}
              hasAvatar={hasAvatar}
              oauthImage={oauthImage}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Notifications</Label>
            <EmailPrefToggle enabled={emailNotificationsEnabled} />
          </div>
          <div className="grid gap-1.5">
            <Label>Background</Label>
            <BackgroundShadeSwatches value={shade} onSelect={pickShade} allowDefault />
            <p className="text-xs text-muted-foreground">
              The dashed circle uses the workspace default.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
