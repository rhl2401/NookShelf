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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mergePersons } from "@/lib/actions/people";
import { Combine } from "lucide-react";

type PersonOption = { id: string; name: string; email: string | null; hasLogin: boolean };

function personLabel(p: PersonOption) {
  return `${p.name} ${p.email ? `(${p.email})` : ""} ${p.hasLogin ? "· has login" : ""}`.trim();
}

export function MergePeopleDialog({ people }: { people: PersonOption[] }) {
  const [open, setOpen] = useState(false);
  const [sourceId, setSourceId] = useState<string>("");
  const [targetId, setTargetId] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!sourceId || !targetId) return;
    startTransition(async () => {
      try {
        await mergePersons(sourceId, targetId);
        toast.success("People merged");
        setOpen(false);
        setSourceId("");
        setTargetId("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't merge people");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTriggerButton
        trigger={
          <Button variant="outline">
            <Combine /> Merge people
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge two people</DialogTitle>
          <DialogDescription>
            Everything assigned to the first person (assets, checkouts, roles, history) moves to
            the second. The first person is marked as merged and can&apos;t be used again.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label>Merge this person…</Label>
            <Select value={sourceId} onValueChange={(v) => setSourceId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select person">
                  {(v: string) => {
                    const p = people.find((p) => p.id === v);
                    return p ? personLabel(p) : "Select person";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {people.map((p) => (
                  <SelectItem key={p.id} value={p.id} disabled={p.id === targetId}>
                    {p.name} {p.email ? `(${p.email})` : ""} {p.hasLogin ? "· has login" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>…into this person (survivor)</Label>
            <Select value={targetId} onValueChange={(v) => setTargetId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select person">
                  {(v: string) => {
                    const p = people.find((p) => p.id === v);
                    return p ? personLabel(p) : "Select person";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {people.map((p) => (
                  <SelectItem key={p.id} value={p.id} disabled={p.id === sourceId}>
                    {p.name} {p.email ? `(${p.email})` : ""} {p.hasLogin ? "· has login" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !sourceId || !targetId}>
            Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
