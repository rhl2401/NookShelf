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
import { Checkbox } from "@/components/ui/checkbox";
import { createWebhook } from "@/lib/actions/webhooks";
import { Plus } from "lucide-react";

const EVENT_TYPES = [
  "WARRANTY_EXPIRING",
  "CHECKOUT_DUE_SOON",
  "CHECKOUT_OVERDUE",
  "MERGE_PERFORMED",
  "GENERIC",
] as const;

export function WebhookFormDialog() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [events, setEvents] = useState<Set<string>>(new Set(EVENT_TYPES));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(event: string) {
    setEvents((prev) => {
      const next = new Set(prev);
      if (next.has(event)) next.delete(event);
      else next.add(event);
      return next;
    });
  }

  function submit() {
    startTransition(async () => {
      try {
        await createWebhook({ url, secret: secret || undefined, events: Array.from(events) });
        toast.success("Webhook added");
        setOpen(false);
        setUrl("");
        setSecret("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't add webhook");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTriggerButton
        trigger={
          <Button variant="outline">
            <Plus /> New webhook
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New webhook</DialogTitle>
          <DialogDescription>
            We&apos;ll POST a JSON payload here for the events you select, signed with your secret
            via an X-Signature header (HMAC-SHA256) if you set one.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label>URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div className="grid gap-1.5">
            <Label>Secret (optional)</Label>
            <Input value={secret} onChange={(e) => setSecret(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Events</Label>
            {EVENT_TYPES.map((event) => (
              <label key={event} className="flex items-center gap-2 text-sm">
                <Checkbox checked={events.has(event)} onCheckedChange={() => toggle(event)} />
                {event}
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !url || events.size === 0}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
