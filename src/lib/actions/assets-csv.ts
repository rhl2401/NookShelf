"use server";

import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { writeAudit } from "@/lib/audit";
import { generateAssetTag } from "@/lib/asset-tag";
import { getDefaultCurrency } from "@/lib/currency";
import { revalidatePath } from "next/cache";

export async function importAssetsCsv(formData: FormData) {
  const session = await requirePermission("asset:manage");
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided.");

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse error: ${parsed.errors[0].message}`);
  }

  const [assetTypes, locations] = await Promise.all([
    prisma.assetType.findMany(),
    prisma.location.findMany(),
  ]);
  const assetTypeByName = new Map(assetTypes.map((t) => [t.name.toLowerCase(), t]));
  const locationByName = new Map(locations.map((l) => [l.name.toLowerCase(), l]));
  const genericType = assetTypeByName.get("generic");

  let created = 0;
  const errors: string[] = [];

  for (const [index, row] of parsed.data.entries()) {
    const name = row.name?.trim();
    if (!name) {
      errors.push(`Row ${index + 2}: missing name`);
      continue;
    }
    const assetType =
      (row.assetType && assetTypeByName.get(row.assetType.trim().toLowerCase())) || genericType;
    if (!assetType) {
      errors.push(`Row ${index + 2}: unknown asset type "${row.assetType}"`);
      continue;
    }
    const location = row.location ? locationByName.get(row.location.trim().toLowerCase()) : null;

    const asset = await prisma.asset.create({
      data: {
        assetTag: generateAssetTag(),
        name,
        assetTypeId: assetType.id,
        locationId: location?.id ?? null,
        status: (row.status?.trim().toUpperCase() as "IN_USE" | undefined) || "IN_STORAGE",
        notes: row.notes || null,
        purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : null,
        purchasePrice: row.purchasePrice || null,
        purchaseCurrency: row.purchasePrice
          ? (row.purchaseCurrency?.trim().toUpperCase() || getDefaultCurrency())
          : null,
        vendor: row.vendor || null,
      },
    });
    created++;
    await writeAudit({
      entityType: "Asset",
      entityId: asset.id,
      assetId: asset.id,
      action: "CREATE",
      actorId: session.user.personId,
      after: asset,
    });
  }

  revalidatePath("/assets");
  return { created, errors };
}
