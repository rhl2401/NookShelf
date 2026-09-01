"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { DialogTriggerButton } from "@/components/dialog-trigger-button";
import { AssetTypeIcon } from "@/components/asset-type-icon";
import { importAssetTypeTemplates } from "@/lib/actions/asset-types";
import { STARTER_TEMPLATES, parseAssetTypeTemplateInput } from "@/lib/asset-type-templates";

export function ImportTemplateDialog({ trigger }: { trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [selectedStarters, setSelectedStarters] = useState<Set<string>>(new Set());
  const [pasted, setPasted] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { pastedTemplates, parseError } = useMemo(() => {
    const text = pasted.trim();
    if (!text) return { pastedTemplates: [], parseError: null };
    try {
      return { pastedTemplates: parseAssetTypeTemplateInput(JSON.parse(text)), parseError: null };
    } catch (err) {
      return {
        pastedTemplates: [],
        parseError: err instanceof Error ? err.message : "That's not valid JSON.",
      };
    }
  }, [pasted]);

  const chosenStarters = STARTER_TEMPLATES.filter((t) => selectedStarters.has(t.name));
  const toImport = [...chosenStarters, ...pastedTemplates];

  function toggleStarter(name: string) {
    setSelectedStarters((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function pickFile() {
    fileInputRef.current?.click();
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPasted(String(reader.result ?? ""));
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function reset() {
    setSelectedStarters(new Set());
    setPasted("");
  }

  function submit() {
    if (toImport.length === 0) return;
    startTransition(async () => {
      try {
        const { created, skipped } = await importAssetTypeTemplates(
          JSON.stringify({ templates: toImport }),
        );
        if (created.length > 0) {
          toast.success(`Imported ${created.length} asset type${created.length === 1 ? "" : "s"}`);
        }
        if (skipped.length > 0) {
          toast.error(skipped.map((s) => `${s.name}: ${s.reason}`).join("; "));
        }
        setOpen(false);
        reset();
        router.refresh();
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
        if (!next) reset();
      }}
    >
      <DialogTriggerButton trigger={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import asset type template</DialogTitle>
          <DialogDescription>
            Add one of the starter templates, or paste/upload a template (or bundle) shared with
            you.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid gap-1.5">
            <Label>Starter templates</Label>
            <div className="grid gap-1.5">
              {STARTER_TEMPLATES.map((t) => (
                <label
                  key={t.name}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border p-2 text-sm hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedStarters.has(t.name)}
                    onCheckedChange={() => toggleStarter(t.name)}
                  />
                  <AssetTypeIcon icon={t.icon} color={t.iconColor} size="sm" />
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.fieldSchema.length} field{t.fieldSchema.length === 1 ? "" : "s"}
                      {t.category ? ` · ${t.category}` : ""}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="template-json">Paste or upload your own</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={onFileChosen}
              />
              <Button type="button" size="sm" variant="outline" onClick={pickFile}>
                <Upload className="size-3.5" /> Upload .json
              </Button>
            </div>
            <Textarea
              id="template-json"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder='{ "name": "My type", "fieldSchema": [...] }'
              rows={5}
              className="font-mono text-xs"
            />
            {parseError && <p className="text-xs text-destructive">{parseError}</p>}
            {pastedTemplates.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Found {pastedTemplates.length}: {pastedTemplates.map((t) => t.name).join(", ")}
              </p>
            )}
          </div>

          {toImport.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Ready to import {toImport.length}: {toImport.map((t) => t.name).join(", ")}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || toImport.length === 0}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
