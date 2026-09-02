"use client";

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

export function ProfileSettingsDialog({
  open,
  onOpenChange,
  personId,
  name,
  hasAvatar,
  oauthImage,
  emailNotificationsEnabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
  name: string;
  hasAvatar: boolean;
  oauthImage?: string | null;
  emailNotificationsEnabled: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Profile settings</DialogTitle>
          <DialogDescription>Your picture and notification preferences.</DialogDescription>
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
