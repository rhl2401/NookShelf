import "server-only";
import { prisma } from "@/lib/prisma";
import { PATH_SEPARATOR, type ExportBundle } from "@/lib/data-io/types";
import type { AssetFieldDef } from "@/lib/asset-fields";

/** Builds the full "House / Garage / Shelf 3" style path for every location. */
async function buildLocationPaths(): Promise<Map<string, string>> {
  const locations = await prisma.location.findMany({
    select: { id: true, name: true, parentId: true },
  });
  const byId = new Map(locations.map((l) => [l.id, l]));

  const paths = new Map<string, string>();
  function pathFor(id: string): string {
    const cached = paths.get(id);
    if (cached) return cached;
    const loc = byId.get(id);
    if (!loc) return "";
    const path = loc.parentId ? `${pathFor(loc.parentId)}${PATH_SEPARATOR}${loc.name}` : loc.name;
    paths.set(id, path);
    return path;
  }
  for (const loc of locations) pathFor(loc.id);
  return paths;
}

export async function buildExportBundle(): Promise<ExportBundle> {
  const [locations, assetTypes, assets, kits] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: "asc" } }),
    prisma.assetType.findMany({ orderBy: { name: "asc" } }),
    prisma.asset.findMany({
      include: {
        assetType: true,
        location: true,
        assignedTo: true,
        parentAsset: { select: { assetTag: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { assetTag: "asc" },
    }),
    prisma.kit.findMany({
      include: { members: { include: { asset: { select: { assetTag: true } } } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const locationPaths = await buildLocationPaths();

  return {
    meta: { exportedAt: new Date().toISOString(), version: 1 },
    locations: locations.map((l) => ({
      path: locationPaths.get(l.id) ?? l.name,
      notes: l.notes,
    })),
    assetTypes: assetTypes.map((t) => ({
      name: t.name,
      category: t.category,
      icon: t.icon,
      fieldSchema: (t.fieldSchema as AssetFieldDef[]) ?? [],
    })),
    assets: assets.map((a) => ({
      assetTag: a.assetTag,
      name: a.name,
      assetType: a.assetType.name,
      location: a.locationId ? (locationPaths.get(a.locationId) ?? null) : null,
      assignedToEmail: a.assignedTo?.email ?? null,
      parentAssetTag: a.parentAsset?.assetTag ?? null,
      status: a.status,
      notes: a.notes,
      purchaseDate: a.purchaseDate ? a.purchaseDate.toISOString().slice(0, 10) : null,
      purchasePrice: a.purchasePrice?.toString() ?? null,
      purchaseCurrency: a.purchaseCurrency,
      vendor: a.vendor,
      warrantyExpiresAt: a.warrantyExpiresAt ? a.warrantyExpiresAt.toISOString().slice(0, 10) : null,
      tags: a.tags.map((t) => t.tag.name),
      customFields: (a.customFields as Record<string, unknown>) ?? {},
    })),
    kits: kits.map((k) => ({
      name: k.name,
      description: k.description,
      memberAssetTags: k.members.map((m) => m.asset.assetTag),
    })),
  };
}
