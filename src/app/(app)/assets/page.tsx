import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  buildLocationTree,
  flattenLocationTree,
  getDescendantLocationIds,
  buildAncestryChains,
} from "@/lib/locations";
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
  const tagsFilter = Array.isArray(sp.tags) ? sp.tags : typeof sp.tags === "string" ? [sp.tags] : [];
  const sortColumn = typeof sp.sort === "string" ? sp.sort : undefined;
  const sortDir: "asc" | "desc" = sp.dir === "desc" ? "desc" : "asc";

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
  if (tagsFilter.length > 0) {
    where.tags = { some: { tag: { name: { in: tagsFilter } } } };
  }

  // Tags are multi-valued (many-to-many), so Prisma can't order by them
  // directly — fetch a generously large window and sort by each asset's
  // alphabetically-first tag in JS instead, then slice to the display cap.
  const isTagSort = sortColumn === "tags";
  const orderBy: Prisma.AssetOrderByWithRelationInput = isTagSort
    ? { createdAt: "desc" }
    : sortColumn === "name"
      ? { name: sortDir }
      : sortColumn === "type"
        ? { assetType: { name: sortDir } }
        : sortColumn === "category"
          ? { assetType: { category: sortDir } }
          : sortColumn === "location"
            ? { location: { name: sortDir } }
            : sortColumn === "assignedTo"
              ? { assignedTo: { name: sortDir } }
              : sortColumn === "status"
                ? { status: sortDir }
                : { createdAt: "desc" };

  const [assets, assetTypes, tree, people, allTags, vendors, myPictures, workspacePictures] =
    await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          assetType: true,
          location: true,
          assignedTo: true,
          tags: { include: { tag: true } },
        },
        orderBy,
        take: isTagSort ? 5000 : 200,
      }),
      prisma.assetType.findMany({ orderBy: { name: "asc" } }),
      buildLocationTree(),
      prisma.person.findMany({ where: { status: { not: "MERGED" } }, orderBy: { name: "asc" } }),
      prisma.tag.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
      prisma.asset.findMany({
        where: { vendor: { not: null } },
        distinct: ["vendor"],
        orderBy: { vendor: "asc" },
        select: { vendor: true },
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

  const flatLocations = flattenLocationTree(tree);
  const locationAncestry = buildAncestryChains(tree);
  const assetOptions = assets.map((a) => ({ id: a.id, name: a.name, assetTag: a.assetTag }));

  const sortedAssets = isTagSort
    ? [...assets]
        .sort((a, b) => {
          const aKey = a.tags.map((t) => t.tag.name).sort()[0] ?? null;
          const bKey = b.tags.map((t) => t.tag.name).sort()[0] ?? null;
          if (aKey === null && bKey === null) return 0;
          if (aKey === null) return 1;
          if (bKey === null) return -1;
          const cmp = aKey.localeCompare(bKey);
          return sortDir === "desc" ? -cmp : cmp;
        })
        .slice(0, 200)
    : assets;

  // Prisma's Decimal (purchasePrice) can't cross the server/client boundary —
  // the table doesn't display it, so just leave it out of what's passed down.
  const tableAssets = sortedAssets.map((a) => ({
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
          <p className="text-sm text-muted-foreground">{tableAssets.length} shown</p>
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
              tagSuggestions={allTags.map((t) => t.name)}
              vendorSuggestions={vendors.map((a) => a.vendor).filter((v) => v != null)}
            />
          )}
        </div>
      </div>

      <AssetsFilterBar
        assetTypes={assetTypes}
        flatLocations={flatLocations}
        tags={allTags.map((t) => t.name)}
      />

      <AssetsTable
        assets={tableAssets}
        flatLocations={flatLocations}
        locationAncestry={locationAncestry}
        people={people}
        canManage={canManage}
      />
    </div>
  );
}
