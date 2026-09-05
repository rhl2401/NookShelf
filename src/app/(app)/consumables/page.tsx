import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildLocationTree, flattenLocationTree } from "@/lib/locations";
import { Button } from "@/components/ui/button";
import { ConsumableFormDialog } from "@/components/consumables/consumable-form-dialog";
import { ConsumablesList } from "@/components/consumables/consumables-list";
import { Plus } from "lucide-react";

export default async function ConsumablesPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("consumable:view")) redirect("/dashboard");
  const canManage = session.user.permissions.includes("consumable:manage");

  const [consumables, tree, myPictures, workspacePictures] = await Promise.all([
    prisma.consumable.findMany({
      include: { location: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    buildLocationTree(),
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

  const flatLocations = flattenLocationTree(tree);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Consumables</h1>
          <p className="text-sm text-muted-foreground">
            Identical stock items that get used up — soap, labels, and the like. Track how many
            are on hand, not individual items.
          </p>
        </div>
        {canManage && (
          <ConsumableFormDialog
            trigger={
              <Button>
                <Plus /> New consumable
              </Button>
            }
            flatLocations={flatLocations}
            myPictures={myPictures}
            workspacePictures={workspacePictures}
          />
        )}
      </div>

      <ConsumablesList
        consumables={consumables}
        flatLocations={flatLocations}
        canManage={canManage}
        myPictures={myPictures}
        workspacePictures={workspacePictures}
      />
    </div>
  );
}
