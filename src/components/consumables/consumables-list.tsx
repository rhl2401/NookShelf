"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssetPicture } from "@/components/asset-picture";
import { ConsumableFormDialog } from "@/components/consumables/consumable-form-dialog";
import { DeleteConsumableButton } from "@/components/consumables/delete-consumable-button";
import type { PictureRef } from "@/components/pictures/picture-row";
import { adjustConsumableQuantity } from "@/lib/actions/consumables";

type ConsumableRow = {
  id: string;
  name: string;
  category: string | null;
  icon: string | null;
  iconColor: string | null;
  primaryPictureId: string | null;
  quantity: number;
  lowStockThreshold: number | null;
  locationId: string | null;
  location: { id: string; name: string } | null;
};

export function ConsumablesList({
  consumables,
  flatLocations,
  canManage,
  myPictures,
  workspacePictures,
}: {
  consumables: ConsumableRow[];
  flatLocations: Array<{ id: string; label: string }>;
  canManage: boolean;
  myPictures: PictureRef[];
  workspacePictures: PictureRef[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function adjust(id: string, delta: number) {
    startTransition(async () => {
      try {
        await adjustConsumableQuantity(id, delta);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update quantity");
      }
    });
  }

  if (consumables.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No consumables yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Quantity</TableHead>
          {canManage && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {consumables.map((c) => {
          const lowStock = c.lowStockThreshold != null && c.quantity <= c.lowStockThreshold;
          return (
            <TableRow key={c.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <AssetPicture
                    pictureId={c.primaryPictureId}
                    icon={c.icon}
                    color={c.iconColor}
                    alt={c.name}
                    size="sm"
                  />
                  <div>
                    <p className="font-medium">{c.name}</p>
                    {c.category && (
                      <p className="text-xs text-muted-foreground">{c.category}</p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {c.location?.name ?? "—"}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {canManage && (
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => adjust(c.id, -1)}
                      disabled={isPending || c.quantity <= 0}
                    >
                      <Minus className="size-3.5" />
                    </Button>
                  )}
                  <span className="w-8 text-center tabular-nums">{c.quantity}</span>
                  {canManage && (
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => adjust(c.id, 1)}
                      disabled={isPending}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  )}
                  {lowStock && (
                    <Badge variant="destructive" className="ml-1">
                      Low stock
                    </Badge>
                  )}
                </div>
              </TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <ConsumableFormDialog
                      consumable={c}
                      trigger={<Button variant="outline">Edit</Button>}
                      flatLocations={flatLocations}
                      myPictures={myPictures}
                      workspacePictures={workspacePictures}
                    />
                    <DeleteConsumableButton consumableId={c.id} />
                  </div>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
