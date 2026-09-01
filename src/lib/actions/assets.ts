"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireSession } from "@/lib/auth-helpers";
import { writeAudit } from "@/lib/audit";
import { generateAssetTag } from "@/lib/asset-tag";
import { validateCustomFields, type AssetFieldDef } from "@/lib/asset-fields";
import { saveAssetAttachment, deleteStoredFile } from "@/lib/storage";
import type { Prisma } from "@/generated/prisma/client";

const assetSchema = z.object({
  name: z.string().min(1).max(160),
  assetTypeId: z.string().min(1),
  locationId: z.string().nullable().optional(),
  assignedToId: z.string().nullable().optional(),
  parentAssetId: z.string().nullable().optional(),
  status: z.enum(["IN_USE", "IN_STORAGE", "CHECKED_OUT", "RETIRED", "LOST", "DISPOSED"]),
  notes: z.string().max(4000).optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.union([z.number(), z.string()]).optional(),
  purchaseCurrency: z.string().length(3).optional(),
  vendor: z.string().max(160).optional(),
  warrantyExpiresAt: z.string().optional(),
  tags: z.array(z.string().min(1).max(40)).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

type AssetInput = z.infer<typeof assetSchema>;

async function isAssetAncestorOrSelf(candidateAncestorId: string, assetId: string) {
  let currentId: string | null = assetId;
  while (currentId) {
    if (currentId === candidateAncestorId) return true;
    const asset: { parentAssetId: string | null } | null = await prisma.asset.findUnique({
      where: { id: currentId },
      select: { parentAssetId: true },
    });
    currentId = asset?.parentAssetId ?? null;
  }
  return false;
}

async function resolveTagIds(tx: Prisma.TransactionClient, names: string[]) {
  const ids: string[] = [];
  for (const rawName of names) {
    const name = rawName.trim();
    if (!name) continue;
    const tag = await tx.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    ids.push(tag.id);
  }
  return ids;
}

async function loadFieldSchema(assetTypeId: string): Promise<AssetFieldDef[]> {
  const assetType = await prisma.assetType.findUniqueOrThrow({ where: { id: assetTypeId } });
  return (assetType.fieldSchema as AssetFieldDef[]) ?? [];
}

export async function createAsset(input: AssetInput) {
  const session = await requirePermission("asset:manage");
  const data = assetSchema.parse(input);

  const fieldSchema = await loadFieldSchema(data.assetTypeId);
  const customFields = validateCustomFields(fieldSchema, data.customFields ?? {});

  if (data.parentAssetId) {
    // A brand-new asset can't yet have descendants, so only need to guard against
    // pointing at itself, which is impossible before creation — nothing to check here.
  }

  let asset;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      asset = await prisma.$transaction(async (tx) => {
        const tagIds = await resolveTagIds(tx, data.tags ?? []);
        return tx.asset.create({
          data: {
            assetTag: generateAssetTag(),
            name: data.name,
            assetTypeId: data.assetTypeId,
            locationId: data.locationId || null,
            assignedToId: data.assignedToId || null,
            parentAssetId: data.parentAssetId || null,
            status: data.status,
            notes: data.notes || null,
            purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
            purchasePrice: data.purchasePrice != null ? String(data.purchasePrice) : null,
            purchaseCurrency: data.purchaseCurrency || null,
            vendor: data.vendor || null,
            warrantyExpiresAt: data.warrantyExpiresAt ? new Date(data.warrantyExpiresAt) : null,
            customFields: customFields as Prisma.InputJsonValue,
            tags: { create: tagIds.map((tagId) => ({ tagId })) },
          },
        });
      });
      break;
    } catch (err) {
      const isUniqueConflict =
        err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002";
      if (!isUniqueConflict || attempt === 4) throw err;
    }
  }

  await writeAudit({
    entityType: "Asset",
    entityId: asset!.id,
    assetId: asset!.id,
    action: "CREATE",
    actorId: session.user.personId,
    after: asset,
  });

  revalidatePath("/assets");
  return asset!;
}

export async function updateAsset(assetId: string, input: AssetInput) {
  const session = await requirePermission("asset:manage");
  const data = assetSchema.parse(input);

  const before = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
  const fieldSchema = await loadFieldSchema(data.assetTypeId);
  const customFields = validateCustomFields(fieldSchema, data.customFields ?? {});

  if (data.parentAssetId) {
    if (data.parentAssetId === assetId) throw new Error("An asset can't be its own parent.");
    const wouldCycle = await isAssetAncestorOrSelf(assetId, data.parentAssetId);
    if (wouldCycle) throw new Error("Can't move an asset under one of its own children.");
  }

  const asset = await prisma.$transaction(async (tx) => {
    const tagIds = await resolveTagIds(tx, data.tags ?? []);
    await tx.assetTag.deleteMany({ where: { assetId } });
    return tx.asset.update({
      where: { id: assetId },
      data: {
        name: data.name,
        assetTypeId: data.assetTypeId,
        locationId: data.locationId || null,
        assignedToId: data.assignedToId || null,
        parentAssetId: data.parentAssetId || null,
        status: data.status,
        notes: data.notes || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        purchasePrice: data.purchasePrice != null ? String(data.purchasePrice) : null,
        purchaseCurrency: data.purchaseCurrency || null,
        vendor: data.vendor || null,
        warrantyExpiresAt: data.warrantyExpiresAt ? new Date(data.warrantyExpiresAt) : null,
        customFields: customFields as Prisma.InputJsonValue,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    });
  });

  let action: "UPDATE" | "MOVE" | "ASSIGN" | "STATUS_CHANGE" = "UPDATE";
  if (before.locationId !== asset.locationId) action = "MOVE";
  else if (before.assignedToId !== asset.assignedToId) action = "ASSIGN";
  else if (before.status !== asset.status) action = "STATUS_CHANGE";

  await writeAudit({
    entityType: "Asset",
    entityId: asset.id,
    assetId: asset.id,
    action,
    actorId: session.user.personId,
    before,
    after: asset,
  });

  revalidatePath("/assets");
  revalidatePath(`/assets/${assetId}`);
  return asset;
}

export async function deleteAsset(assetId: string) {
  const session = await requirePermission("asset:manage");
  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });

  if (asset.status === "CHECKED_OUT") {
    throw new Error("This asset is checked out — check it in before deleting.");
  }

  await prisma.asset.delete({ where: { id: assetId } });
  await writeAudit({
    entityType: "Asset",
    entityId: assetId,
    action: "DELETE",
    actorId: session.user.personId,
    before: asset,
  });

  revalidatePath("/assets");
}

export async function bulkMove(assetIds: string[], locationId: string | null) {
  const session = await requirePermission("asset:manage");
  await prisma.asset.updateMany({ where: { id: { in: assetIds } }, data: { locationId } });
  await Promise.all(
    assetIds.map((assetId) =>
      writeAudit({
        entityType: "Asset",
        entityId: assetId,
        assetId,
        action: "MOVE",
        actorId: session.user.personId,
        after: { locationId },
      }),
    ),
  );
  revalidatePath("/assets");
}

export async function bulkAssign(assetIds: string[], assignedToId: string | null) {
  const session = await requirePermission("asset:manage");
  await prisma.asset.updateMany({ where: { id: { in: assetIds } }, data: { assignedToId } });
  await Promise.all(
    assetIds.map((assetId) =>
      writeAudit({
        entityType: "Asset",
        entityId: assetId,
        assetId,
        action: "ASSIGN",
        actorId: session.user.personId,
        after: { assignedToId },
      }),
    ),
  );
  revalidatePath("/assets");
}

export async function bulkRetire(assetIds: string[]) {
  const session = await requirePermission("asset:manage");
  await prisma.asset.updateMany({ where: { id: { in: assetIds } }, data: { status: "RETIRED" } });
  await Promise.all(
    assetIds.map((assetId) =>
      writeAudit({
        entityType: "Asset",
        entityId: assetId,
        assetId,
        action: "STATUS_CHANGE",
        actorId: session.user.personId,
        after: { status: "RETIRED" },
      }),
    ),
  );
  revalidatePath("/assets");
}

export async function bulkTag(assetIds: string[], tagNames: string[]) {
  const session = await requirePermission("asset:manage");
  await prisma.$transaction(async (tx) => {
    const tagIds = await resolveTagIds(tx, tagNames);
    for (const assetId of assetIds) {
      await tx.assetTag.createMany({
        data: tagIds.map((tagId) => ({ assetId, tagId })),
        skipDuplicates: true,
      });
    }
  });
  await writeAudit({
    entityType: "Asset",
    entityId: assetIds.join(","),
    action: "UPDATE",
    actorId: session.user.personId,
    after: { taggedWith: tagNames, assetIds },
  });
  revalidatePath("/assets");
}

export async function uploadAttachment(assetId: string, formData: FormData) {
  const session = await requireSession();
  if (!session.user.permissions.includes("asset:manage")) {
    throw new Error("Missing permission: asset:manage");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file provided.");
  if (file.size > 20 * 1024 * 1024) throw new Error("File is too large (max 20MB).");

  const relativePath = await saveAssetAttachment(assetId, file);
  const kind = file.type.startsWith("image/") ? "photo" : "document";

  const attachment = await prisma.attachment.create({
    data: {
      assetId,
      kind,
      path: relativePath,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      uploadedById: session.user.personId,
    },
  });

  revalidatePath(`/assets/${assetId}`);
  return attachment;
}

export async function deleteAttachment(attachmentId: string) {
  await requirePermission("asset:manage");
  const attachment = await prisma.attachment.findUniqueOrThrow({ where: { id: attachmentId } });
  await prisma.attachment.delete({ where: { id: attachmentId } });
  await deleteStoredFile(attachment.path);
  revalidatePath(`/assets/${attachment.assetId}`);
}

export async function setAssetIcon(assetId: string, icon: string | null) {
  const session = await requirePermission("asset:manage");
  const before = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
  const asset = await prisma.asset.update({ where: { id: assetId }, data: { icon } });
  await writeAudit({
    entityType: "Asset",
    entityId: assetId,
    action: "UPDATE",
    actorId: session.user.personId,
    before: { icon: before.icon },
    after: { icon: asset.icon },
  });
  revalidatePath(`/assets/${assetId}`);
}

export async function setAssetPrimaryPhoto(assetId: string, formData: FormData) {
  const session = await requireSession();
  if (!session.user.permissions.includes("asset:manage")) {
    throw new Error("Missing permission: asset:manage");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file provided.");
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 20 * 1024 * 1024) throw new Error("File is too large (max 20MB).");

  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
  const relativePath = await saveAssetAttachment(assetId, file);

  const attachment = await prisma.attachment.create({
    data: {
      assetId,
      kind: "photo",
      path: relativePath,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      uploadedById: session.user.personId,
    },
  });
  await prisma.asset.update({ where: { id: assetId }, data: { primaryPhotoId: attachment.id } });

  if (asset.primaryPhotoId) {
    const old = await prisma.attachment.findUnique({ where: { id: asset.primaryPhotoId } });
    if (old) {
      await prisma.attachment.delete({ where: { id: old.id } });
      await deleteStoredFile(old.path);
    }
  }

  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  return attachment;
}

export async function removeAssetPrimaryPhoto(assetId: string) {
  await requirePermission("asset:manage");
  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
  if (!asset.primaryPhotoId) return;
  const attachment = await prisma.attachment.findUnique({ where: { id: asset.primaryPhotoId } });
  await prisma.asset.update({ where: { id: assetId }, data: { primaryPhotoId: null } });
  if (attachment) {
    await prisma.attachment.delete({ where: { id: attachment.id } });
    await deleteStoredFile(attachment.path);
  }
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
}
