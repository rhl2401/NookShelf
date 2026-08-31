"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteRole } from "@/lib/actions/roles";

export function DeleteRoleButton({ roleId }: { roleId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onDelete() {
    if (!confirm("Delete this role? People with only this role will lose its permissions."))
      return;
    startTransition(async () => {
      try {
        await deleteRole(roleId);
        toast.success("Role deleted");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't delete role");
      }
    });
  }

  return (
    <Button variant="ghost" size="icon" onClick={onDelete} disabled={isPending}>
      <Trash2 className="size-4" />
    </Button>
  );
}
