"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { checkoutAsset, checkoutKit } from "@/lib/actions/checkouts";
import { ArrowLeftRight } from "lucide-react";

export function CheckoutDialog({
  target,
  people,
  trigger,
}: {
  target: { kind: "asset" | "kit"; id: string; label: string };
  people: Array<{ id: string; name: string }>;
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [borrowerId, setBorrowerId] = useState("");
  const [dueAt, setDueAt] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      try {
        if (target.kind === "asset") {
          await checkoutAsset(target.id, { borrowerId, dueAt, notes });
        } else {
          await checkoutKit(target.id, { borrowerId, dueAt, notes });
        }
        toast.success(`Checked out ${target.label}`);
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't check out");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTriggerButton
        trigger={
          trigger ?? (
            <Button size="sm">
              <ArrowLeftRight className="size-4" /> Check out
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check out {target.label}</DialogTitle>
          <DialogDescription>Who is taking this, and when is it due back?</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label>Borrower</Label>
            <Select value={borrowerId} onValueChange={(v) => setBorrowerId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select person">
                  {(v: string) => people.find((p) => p.id === v)?.name ?? "Select person"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {people.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Due back</Label>
            <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !borrowerId || !dueAt}>
            Check out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
