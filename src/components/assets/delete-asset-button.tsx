"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteAsset } from "@/lib/actions/assets";

export function DeleteAssetButton({ assetId }: { assetId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onDelete() {
    if (
      !confirm(
        "Delete this asset permanently? This also deletes its history and can't be undone — consider retiring it instead.",
      )
    )
      return;
    startTransition(async () => {
      try {
        await deleteAsset(assetId);
        toast.success("Asset deleted");
        router.push("/assets");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't delete asset");
      }
    });
  }

  return (
    <Button variant="outline" onClick={onDelete} disabled={isPending}>
      <Trash2 className="size-4" /> Delete
    </Button>
  );
}
