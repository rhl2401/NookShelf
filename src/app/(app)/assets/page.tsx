import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildLocationTree, flattenLocationTree, getDescendantLocationIds } from "@/lib/locations";
import { Button } from "@/components/ui/button";
import { AssetsFilterBar } from "@/components/assets/assets-filter-bar";
import { AssetsTable } from "@/components/assets/assets-table";
import { AssetFormDialog } from "@/components/assets/asset-form-dialog";
import { ImportCsvDialog } from "@/components/assets/import-csv-dialog";
import { getDefaultCurrency } from "@/lib/currency";
import { Plus, Download } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";

export default async function AssetsPage({ searchParams }: PageProps<"/assets">) {
  const session = await auth();
  if (!session?.user.permissions.includes("asset:view")) redirect("/dashboard");
  const canManage = session.user.permissions.includes("asset:manage");

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const typeFilter = typeof sp.type === "string" ? sp.type : undefined;
  const locationFilter = typeof sp.location === "string" ? sp.location : undefined;
  const statusFilter = typeof sp.status === "string" ? sp.status : undefined;

  const where: Prisma.AssetWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { assetTag: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
    ];
  }
  if (typeFilter) where.assetTypeId = typeFilter;
  if (statusFilter) where.status = statusFilter as Prisma.AssetWhereInput["status"];
  if (locationFilter) {
    const ids = await getDescendantLocationIds(locationFilter);
    where.locationId = { in: ids };
  }

  const [assets, assetTypes, tree, people, myPictures, workspacePictures] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: {
        assetType: true,
        location: true,
        assignedTo: true,
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.assetType.findMany({ orderBy: { name: "asc" } }),
    buildLocationTree(),
    prisma.person.findMany({ where: { status: { not: "MERGED" } }, orderBy: { name: "asc" } }),
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
  const assetOptions = assets.map((a) => ({ id: a.id, name: a.name, assetTag: a.assetTag }));
  // Prisma's Decimal (purchasePrice) can't cross the server/client boundary —
  // the table doesn't display it, so just leave it out of what's passed down.
  const tableAssets = assets.map((a) => ({
    id: a.id,
    assetTag: a.assetTag,
    name: a.name,
    status: a.status,
    icon: a.icon,
    iconColor: a.iconColor,
    primaryPictureId: a.primaryPictureId,
    assetType: a.assetType,
    location: a.location,
    assignedTo: a.assignedTo,
    tags: a.tags,
  }));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
          <p className="text-sm text-muted-foreground">{assets.length} shown</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<a href="/api/assets/export" />}>
            <Download /> Export CSV
          </Button>
          {canManage && <ImportCsvDialog />}
          {canManage && (
            <AssetFormDialog
              trigger={
                <Button>
                  <Plus /> New asset
                </Button>
              }
              assetTypes={assetTypes}
              flatLocations={flatLocations}
              people={people}
              assetOptions={assetOptions}
              defaultCurrency={getDefaultCurrency()}
              myPictures={myPictures}
              workspacePictures={workspacePictures}
            />
          )}
        </div>
      </div>

      <AssetsFilterBar assetTypes={assetTypes} flatLocations={flatLocations} />

      <AssetsTable
        assets={tableAssets}
        flatLocations={flatLocations}
        people={people}
        canManage={canManage}
      />
    </div>
  );
}
