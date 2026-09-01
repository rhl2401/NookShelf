"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportAssetTypeTemplate } from "@/lib/actions/asset-types";
import { downloadJson, slugifyFilename } from "@/lib/download-json";

export function ExportTemplateButton({
  assetTypeId,
  assetTypeName,
}: {
  assetTypeId: string;
  assetTypeName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function onExport() {
    startTransition(async () => {
      try {
        const template = await exportAssetTypeTemplate(assetTypeId);
        downloadJson(template, `${slugifyFilename(assetTypeName)}.assettype.json`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Export failed");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onExport}
      disabled={isPending}
      title="Export as template"
    >
      <Download className="size-3.5" />
    </Button>
  );
}
