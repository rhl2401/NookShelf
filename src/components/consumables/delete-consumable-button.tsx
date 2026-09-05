"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteConsumable } from "@/lib/actions/consumables";

export function DeleteConsumableButton({ consumableId }: { consumableId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onDelete() {
    if (!confirm("Delete this consumable?")) return;
    startTransition(async () => {
      try {
        await deleteConsumable(consumableId);
        toast.success("Consumable deleted");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't delete consumable");
      }
    });
  }

  return (
    <Button variant="ghost" size="icon" onClick={onDelete} disabled={isPending}>
      <Trash2 className="size-4" />
    </Button>
  );
}
