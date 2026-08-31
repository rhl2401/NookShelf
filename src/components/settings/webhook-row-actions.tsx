"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { deleteWebhook, toggleWebhook } from "@/lib/actions/webhooks";

export function WebhookRowActions({ id, enabled }: { id: string; enabled: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onToggle() {
    startTransition(async () => {
      await toggleWebhook(id, !enabled);
      router.refresh();
    });
  }

  function onDelete() {
    if (!confirm("Delete this webhook?")) return;
    startTransition(async () => {
      try {
        await deleteWebhook(id);
        toast.success("Webhook deleted");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't delete");
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={enabled} onCheckedChange={onToggle} disabled={isPending} />
        Enabled
      </label>
      <Button variant="ghost" size="icon" onClick={onDelete} disabled={isPending}>
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
