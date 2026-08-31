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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PERMISSIONS, PERMISSION_LABELS, type Permission } from "@/lib/permissions";
import { createRole, updateRole } from "@/lib/actions/roles";

type RoleInput = {
  id?: string;
  name: string;
  description?: string | null;
  permissions: string[];
};

export function RoleFormDialog({
  role,
  trigger,
}: {
  role?: RoleInput;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<Set<string>>(
    new Set(role?.permissions ?? []),
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function togglePermission(p: Permission) {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  function submit() {
    startTransition(async () => {
      try {
        const input = {
          name,
          description: description || undefined,
          permissions: Array.from(permissions) as Permission[],
        };
        if (role?.id) {
          await updateRole(role.id, input);
        } else {
          await createRole(input);
        }
        toast.success(role?.id ? "Role updated" : "Role created");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTriggerButton trigger={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{role?.id ? "Edit role" : "New role"}</DialogTitle>
          <DialogDescription>
            Choose a name and the permissions this role grants.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="role-name">Name</Label>
            <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="role-description">Description</Label>
            <Textarea
              id="role-description"
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Permissions</Label>
            <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
              {PERMISSIONS.map((p) => (
                <label key={p} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={permissions.has(p)}
                    onCheckedChange={() => togglePermission(p)}
                  />
                  <span>
                    <span className="block font-medium">{p}</span>
                    <span className="block text-xs text-muted-foreground">
                      {PERMISSION_LABELS[p]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !name}>
            {role?.id ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
