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
import { Checkbox } from "@/components/ui/checkbox";
import { updatePersonRoles } from "@/lib/actions/people";

export function EditRolesDialog({
  personId,
  personName,
  allRoles,
  currentRoleIds,
}: {
  personId: string;
  personName: string;
  allRoles: Array<{ id: string; name: string }>;
  currentRoleIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(currentRoleIds));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    startTransition(async () => {
      try {
        await updatePersonRoles(personId, Array.from(selected));
        toast.success("Roles updated");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update roles");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTriggerButton trigger={<Button variant="outline">Roles</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Roles for {personName}</DialogTitle>
          <DialogDescription>A person can hold more than one role.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {allRoles.map((role) => (
            <label key={role.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={selected.has(role.id)} onCheckedChange={() => toggle(role.id)} />
              {role.name}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
