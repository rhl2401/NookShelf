"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteAssetType } from "@/lib/actions/asset-types";

export function DeleteAssetTypeButton({ assetTypeId }: { assetTypeId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onDelete() {
    if (!confirm("Delete this asset type?")) return;
    startTransition(async () => {
      try {
        await deleteAssetType(assetTypeId);
        toast.success("Asset type deleted");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't delete asset type");
      }
    });
  }

  return (
    <Button variant="ghost" size="icon" onClick={onDelete} disabled={isPending}>
      <Trash2 className="size-4" />
    </Button>
  );
}
