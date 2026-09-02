"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogTriggerButton } from "@/components/dialog-trigger-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarUploader } from "@/components/settings/avatar-uploader";
import { updatePersonName } from "@/lib/actions/people";

export function EditPersonDialog({
  personId,
  personName,
  hasAvatar,
  oauthImage,
}: {
  personId: string;
  personName: string;
  hasAvatar: boolean;
  oauthImage?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(personName);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      try {
        await updatePersonName(personId, name);
        toast.success("Person updated");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update person");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setName(personName);
      }}
    >
      <DialogTriggerButton trigger={<Button variant="outline">Edit</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {personName}</DialogTitle>
          <DialogDescription>Update their name or profile picture.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="person-name">Name</Label>
            <Input id="person-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Profile picture</Label>
            <AvatarUploader
              personId={personId}
              name={personName}
              hasAvatar={hasAvatar}
              oauthImage={oauthImage}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
