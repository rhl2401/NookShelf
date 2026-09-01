import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AssetTypeFormDialog } from "@/components/asset-types/asset-type-form-dialog";
import { DeleteAssetTypeButton } from "@/components/asset-types/delete-asset-type-button";
import { AssetTypeIcon } from "@/components/asset-type-icon";
import type { AssetFieldDef } from "@/lib/asset-fields";
import { Plus } from "lucide-react";

export default async function AssetTypesPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("asset-type:manage")) redirect("/dashboard");

  const assetTypes = await prisma.assetType.findMany({
    include: { _count: { select: { assets: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Asset Types</h1>
          <p className="text-sm text-muted-foreground">
            Define the custom fields each kind of asset carries — from vehicles to cables.
          </p>
        </div>
        <AssetTypeFormDialog
          trigger={
            <Button>
              <Plus /> New asset type
            </Button>
          }
        />
      </div>

      <div className="flex flex-col gap-3">
        {assetTypes.map((assetType) => {
          const fields = (assetType.fieldSchema as AssetFieldDef[]) ?? [];
          return (
            <Card key={assetType.id}>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <AssetTypeIcon icon={assetType.icon} color={assetType.iconColor} size="lg" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{assetType.name}</p>
                      {assetType.isBuiltIn && <Badge variant="outline">Built-in</Badge>}
                      {assetType.category && (
                        <Badge variant="secondary">{assetType.category}</Badge>
                      )}
                      <Badge variant="outline">{assetType._count.assets} assets</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {fields.map((f) => (
                        <Badge key={f.key} variant="outline" className="font-mono text-[10px]">
                          {f.label}
                        </Badge>
                      ))}
                      {fields.length === 0 && (
                        <span className="text-xs text-muted-foreground">No custom fields</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <AssetTypeFormDialog
                    assetType={assetType}
                    trigger={<Button variant="outline">Edit</Button>}
                  />
                  {!assetType.isBuiltIn && (
                    <DeleteAssetTypeButton assetTypeId={assetType.id} />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
