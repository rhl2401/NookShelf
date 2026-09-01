import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { AssetTypeFormDialog } from "@/components/asset-types/asset-type-form-dialog";
import { ImportTemplateDialog } from "@/components/asset-types/import-template-dialog";
import { AssetTypesList } from "@/components/asset-types/asset-types-list";
import { Plus, Upload } from "lucide-react";

export default async function AssetTypesPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("asset-type:manage")) redirect("/dashboard");

  const [assetTypes, myPictures, workspacePictures] = await Promise.all([
    prisma.assetType.findMany({
      include: { _count: { select: { assets: true } } },
      orderBy: { name: "asc" },
    }),
    session.user.personId
      ? prisma.picture.findMany({
          where: { scope: "PERSONAL", ownerId: session.user.personId },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    prisma.picture.findMany({
      where: { scope: "WORKSPACE" },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Asset Types</h1>
          <p className="text-sm text-muted-foreground">
            Define the custom fields each kind of asset carries — from vehicles to cables.
          </p>
        </div>
        <div className="flex gap-2">
          <ImportTemplateDialog
            trigger={
              <Button variant="outline">
                <Upload /> Import template
              </Button>
            }
          />
          <AssetTypeFormDialog
            trigger={
              <Button>
                <Plus /> New asset type
              </Button>
            }
            myPictures={myPictures}
            workspacePictures={workspacePictures}
          />
        </div>
      </div>

      <AssetTypesList
        assetTypes={assetTypes}
        myPictures={myPictures}
        workspacePictures={workspacePictures}
      />
    </div>
  );
}
