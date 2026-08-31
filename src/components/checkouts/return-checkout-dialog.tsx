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
import { Input } from "@/components/ui/input";
import { returnCheckout } from "@/lib/actions/checkouts";
import { Undo2 } from "lucide-react";

type ItemState = { assetId: string; name: string; isMissing: boolean; isDamaged: boolean; conditionNote: string };

export function ReturnCheckoutDialog({
  checkoutId,
  items,
  label,
}: {
  checkoutId: string;
  items: Array<{ assetId: string; name: string }>;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ItemState[]>(
    items.map((i) => ({ ...i, isMissing: false, isDamaged: false, conditionNote: "" })),
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function update(assetId: string, patch: Partial<ItemState>) {
    setState((prev) => prev.map((i) => (i.assetId === assetId ? { ...i, ...patch } : i)));
  }

  function submit() {
    startTransition(async () => {
      try {
        await returnCheckout(checkoutId, {
          items: state.map((i) => ({
            assetId: i.assetId,
            isMissing: i.isMissing,
            isDamaged: i.isDamaged,
            conditionNote: i.conditionNote || undefined,
          })),
        });
        toast.success(`Checked in ${label}`);
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't check in");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTriggerButton
        trigger={
          <Button size="sm" variant="outline">
            <Undo2 className="size-4" /> Check in
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Check in {label}</DialogTitle>
          <DialogDescription>Flag anything missing or damaged on return.</DialogDescription>
        </DialogHeader>
        <div className="flex max-h-80 flex-col gap-3 overflow-y-auto">
          {state.map((item) => (
            <div key={item.assetId} className="flex flex-col gap-2 rounded-lg border p-3">
              <p className="text-sm font-medium">{item.name}</p>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={item.isMissing}
                    onCheckedChange={(checked) => update(item.assetId, { isMissing: Boolean(checked) })}
                  />
                  Missing
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={item.isDamaged}
                    onCheckedChange={(checked) => update(item.assetId, { isDamaged: Boolean(checked) })}
                  />
                  Damaged
                </label>
              </div>
              {(item.isMissing || item.isDamaged) && (
                <Input
                  placeholder="Note (optional)"
                  value={item.conditionNote}
                  onChange={(e) => update(item.assetId, { conditionNote: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending}>
            Check in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
