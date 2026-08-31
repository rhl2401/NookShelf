"use client";

import { useRef, useState, useTransition } from "react";
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
import { importAssetsCsv } from "@/lib/actions/assets-csv";
import { Upload } from "lucide-react";

export function ImportCsvDialog() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function submit() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      try {
        const res = await importAssetsCsv(formData);
        setResult(res);
        if (res.created > 0) {
          toast.success(`Imported ${res.created} asset(s)`);
          router.refresh();
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setResult(null);
      }}
    >
      <DialogTriggerButton
        trigger={
          <Button variant="outline">
            <Upload /> Import CSV
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import assets from CSV</DialogTitle>
          <DialogDescription>
            Columns: name, assetType, location, status, notes, purchaseDate, purchasePrice,
            purchaseCurrency, vendor.{" "}
            <a href="/api/assets/import-template" className="underline">
              Download a template
            </a>
            .
          </DialogDescription>
        </DialogHeader>
        <input ref={fileInputRef} type="file" accept=".csv" className="text-sm" />
        {result && (
          <div className="rounded-lg border p-2 text-sm">
            <p>{result.created} asset(s) created.</p>
            {result.errors.length > 0 && (
              <ul className="mt-1 list-disc pl-4 text-destructive">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={submit} disabled={isPending}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
