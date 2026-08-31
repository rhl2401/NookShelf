"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteKit } from "@/lib/actions/kits";

export function DeleteKitButton({ kitId }: { kitId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onDelete() {
    if (!confirm("Delete this kit? Its assets aren't deleted, just the bundle.")) return;
    startTransition(async () => {
      try {
        await deleteKit(kitId);
        toast.success("Kit deleted");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't delete kit");
      }
    });
  }

  return (
    <Button variant="ghost" size="icon" onClick={onDelete} disabled={isPending}>
      <Trash2 className="size-4" />
    </Button>
  );
}
