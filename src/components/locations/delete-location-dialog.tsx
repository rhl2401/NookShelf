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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { deleteLocation } from "@/lib/actions/locations";
import type { FlatLocationOption } from "@/components/locations/location-form-dialog";
import { Trash2 } from "lucide-react";

export function DeleteLocationDialog({
  locationId,
  hasChildren,
  assetCount,
  flatLocations,
  onDeleted,
}: {
  locationId: string;
  hasChildren: boolean;
  assetCount: number;
  flatLocations: FlatLocationOption[];
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reassignTo, setReassignTo] = useState<string>("none");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      try {
        await deleteLocation(locationId, {
          reassignAssetsTo: assetCount > 0 ? (reassignTo === "none" ? null : reassignTo) : undefined,
        });
        toast.success("Location deleted");
        setOpen(false);
        onDeleted?.();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't delete location");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTriggerButton
        trigger={
          <Button variant="ghost" size="icon">
            <Trash2 className="size-4" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete location</DialogTitle>
          <DialogDescription>This can&apos;t be undone.</DialogDescription>
        </DialogHeader>

        {hasChildren ? (
          <p className="text-sm text-destructive">
            This location still has child locations. Move or delete them first.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {assetCount > 0 && (
              <div className="grid gap-1.5">
                <Label>
                  {assetCount} asset(s) are here. Move them to:
                </Label>
                <Select value={reassignTo} onValueChange={(v) => setReassignTo(v ?? "none")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No location">
                      {(v: string) =>
                        v === "none"
                          ? "No location (unassigned)"
                          : flatLocations.find((l) => l.id === v)?.label
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No location (unassigned)</SelectItem>
                    {flatLocations
                      .filter((l) => l.id !== locationId)
                      .map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={isPending || hasChildren}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
