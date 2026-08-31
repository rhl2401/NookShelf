"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Upload, FileJson, FileSpreadsheet, FileArchive } from "lucide-react";

const FORMATS = [
  { value: "json", label: "JSON", icon: FileJson, extension: ".json" },
  { value: "csv", label: "CSV (zip)", icon: FileArchive, extension: ".zip" },
  { value: "xlsx", label: "Excel (.xlsx)", icon: FileSpreadsheet, extension: ".xlsx" },
] as const;

type Format = (typeof FORMATS)[number]["value"];

type ImportSummary = {
  assetTypes: { created: number; updated: number };
  locations: { created: number; updated: number };
  assets: { created: number; updated: number };
  kits: { created: number; updated: number };
  warnings: string[];
};

function detectFormat(filename: string): Format {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".xlsx")) return "xlsx";
  return "csv";
}

export function DataIoCard() {
  const [importFormat, setImportFormat] = useState<Format>("json");
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function runImport() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("format", importFormat);

    startTransition(async () => {
      try {
        const res = await fetch("/api/data/import", { method: "POST", body: formData });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Import failed.");
        setResult(body.summary as ImportSummary);
        toast.success("Import complete");
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Import / export</CardTitle>
        <CardDescription>
          Back up or bulk-edit your locations, asset types, assets, and kits. Doesn&apos;t include
          people, roles, or checkout history.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-2">
          <p className="text-sm font-medium">Export everything</p>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <Button
                key={f.value}
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<a href={`/api/data/export?format=${f.value}`} />}
              >
                <Download className="size-3.5" /> {f.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <p className="text-sm font-medium">Example files</p>
          <p className="text-xs text-muted-foreground">
            A small sample dataset in each format, showing exactly what an import file should
            look like.
          </p>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <Button
                key={f.value}
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<a href={`/api/data/example?format=${f.value}`} />}
              >
                <Download className="size-3.5" /> {f.label} example
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-2 border-t pt-4">
          <p className="text-sm font-medium">Import</p>
          <p className="text-xs text-muted-foreground">
            Matches existing records by name/asset tag and updates them; anything new gets
            created. Safe to re-run.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.zip,.xlsx"
              className="text-sm"
              onChange={(e) => {
                const name = e.target.files?.[0]?.name;
                if (name) setImportFormat(detectFormat(name));
              }}
            />
            <Select value={importFormat} onValueChange={(v) => v && setImportFormat(v as Format)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={runImport} disabled={isPending}>
              <Upload className="size-3.5" /> Import
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {result && (
            <div className="mt-2 flex flex-col gap-2 rounded-lg border p-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  Asset types +{result.assetTypes.created} / ~{result.assetTypes.updated}
                </Badge>
                <Badge variant="outline">
                  Locations +{result.locations.created} / ~{result.locations.updated}
                </Badge>
                <Badge variant="outline">
                  Assets +{result.assets.created} / ~{result.assets.updated}
                </Badge>
                <Badge variant="outline">
                  Kits +{result.kits.created} / ~{result.kits.updated}
                </Badge>
              </div>
              {result.warnings.length > 0 && (
                <ul className="list-disc pl-4 text-amber-700 dark:text-amber-500">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
