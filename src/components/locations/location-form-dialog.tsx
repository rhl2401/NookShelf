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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogTriggerButton } from "@/components/dialog-trigger-button";
import { PictureIconEditor } from "@/components/pictures/picture-icon-editor";
import type { PictureRef } from "@/components/pictures/picture-row";
import { createLocation, updateLocation } from "@/lib/actions/locations";

export type FlatLocationOption = { id: string; label: string };

export function LocationFormDialog({
  trigger,
  flatLocations,
  location,
  defaultParentId,
  myPictures,
  workspacePictures,
}: {
  trigger: React.ReactElement;
  flatLocations: FlatLocationOption[];
  location?: {
    id: string;
    name: string;
    parentId: string | null;
    code: string | null;
    icon: string | null;
    iconColor: string | null;
    primaryPictureId: string | null;
    notes: string | null;
  };
  defaultParentId?: string | null;
  myPictures: PictureRef[];
  workspacePictures: PictureRef[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(location?.name ?? "");
  const [parentId, setParentId] = useState<string>(
    location?.parentId ?? defaultParentId ?? "none",
  );
  const [code, setCode] = useState(location?.code ?? "");
  const [icon, setIcon] = useState<string | null>(location?.icon ?? null);
  const [iconColor, setIconColor] = useState<string | null>(location?.iconColor ?? null);
  const [pictureId, setPictureId] = useState<string | null>(location?.primaryPictureId ?? null);
  const [notes, setNotes] = useState(location?.notes ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      try {
        const parsedParentId = parentId === "none" ? null : parentId;
        const payload = {
          name,
          parentId: parsedParentId,
          code: code.trim() || null,
          icon,
          iconColor,
          primaryPictureId: pictureId,
          notes,
        };
        if (location?.id) {
          await updateLocation(location.id, payload);
        } else {
          await createLocation(payload);
        }
        toast.success(location?.id ? "Location updated" : "Location created");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTriggerButton trigger={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{location?.id ? "Edit location" : "New location"}</DialogTitle>
          <DialogDescription>Locations can be nested to any depth.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="location-name">Name</Label>
              <Input id="location-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="location-code">Label / ID</Label>
              <Input
                id="location-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="auto-generated if left blank"
                className="font-mono"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Icon / picture</Label>
            <PictureIconEditor
              name={name || "Location"}
              icon={icon}
              onIconChange={setIcon}
              color={iconColor}
              onColorChange={setIconColor}
              pictureId={pictureId}
              onPictureChange={setPictureId}
              myPictures={myPictures}
              workspacePictures={workspacePictures}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Parent location</Label>
            <Select value={parentId} onValueChange={(v) => setParentId(v ?? "none")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No parent (top level)">
                  {(v: string) =>
                    v === "none" ? "No parent (top level)" : flatLocations.find((l) => l.id === v)?.label
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No parent (top level)</SelectItem>
                {flatLocations
                  .filter((l) => l.id !== location?.id)
                  .map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="location-notes">Notes</Label>
            <Textarea
              id="location-notes"
              value={notes ?? ""}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !name}>
            {location?.id ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
