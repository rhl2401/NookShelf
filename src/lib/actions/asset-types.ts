"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { writeAudit } from "@/lib/audit";
import { fieldDefSchema, type AssetFieldDef } from "@/lib/asset-fields";
import {
  parseAssetTypeTemplateInput,
  type AssetTypeTemplate,
  type AssetTypeTemplateBundle,
} from "@/lib/asset-type-templates";

const assetTypeSchema = z.object({
  name: z.string().min(1).max(80),
  category: z.string().max(80).optional(),
  icon: z.string().max(40).optional(),
  iconColor: z.string().max(20).optional(),
  primaryPictureId: z.string().optional(),
  fieldSchema: z.array(fieldDefSchema),
});

export async function createAssetType(input: z.infer<typeof assetTypeSchema>) {
  const session = await requirePermission("asset-type:manage");
  const data = assetTypeSchema.parse(input);

  const assetType = await prisma.assetType.create({
    data: {
      name: data.name,
      category: data.category || null,
      icon: data.icon || null,
      iconColor: data.iconColor || null,
      primaryPictureId: data.primaryPictureId || null,
      fieldSchema: data.fieldSchema,
    },
  });

  await writeAudit({
    entityType: "AssetType",
    entityId: assetType.id,
    action: "CREATE",
    actorId: session.user.personId,
    after: assetType,
  });

  revalidatePath("/asset-types");
  return assetType;
}

export async function updateAssetType(
  assetTypeId: string,
  input: z.infer<typeof assetTypeSchema>,
) {
  const session = await requirePermission("asset-type:manage");
  const data = assetTypeSchema.parse(input);

  const before = await prisma.assetType.findUniqueOrThrow({ where: { id: assetTypeId } });
  const assetType = await prisma.assetType.update({
    where: { id: assetTypeId },
    data: {
      name: data.name,
      category: data.category || null,
      icon: data.icon || null,
      iconColor: data.iconColor || null,
      primaryPictureId: data.primaryPictureId || null,
      fieldSchema: data.fieldSchema,
    },
  });

  await writeAudit({
    entityType: "AssetType",
    entityId: assetType.id,
    action: "UPDATE",
    actorId: session.user.personId,
    before,
    after: assetType,
  });

  revalidatePath("/asset-types");
  return assetType;
}

export async function deleteAssetType(assetTypeId: string) {
  const session = await requirePermission("asset-type:manage");
  const assetType = await prisma.assetType.findUniqueOrThrow({
    where: { id: assetTypeId },
    include: { _count: { select: { assets: true } } },
  });

  if (assetType.isBuiltIn) throw new Error("Built-in asset types can't be deleted.");
  if (assetType._count.assets > 0) {
    throw new Error(`${assetType._count.assets} asset(s) still use this type.`);
  }

  await prisma.assetType.delete({ where: { id: assetTypeId } });
  await writeAudit({
    entityType: "AssetType",
    entityId: assetTypeId,
    action: "DELETE",
    actorId: session.user.personId,
    before: assetType,
  });

  revalidatePath("/asset-types");
}

function toTemplate(assetType: {
  name: string;
  category: string | null;
  icon: string | null;
  iconColor: string | null;
  fieldSchema: unknown;
}): AssetTypeTemplate {
  return {
    name: assetType.name,
    category: assetType.category,
    icon: assetType.icon,
    iconColor: assetType.iconColor,
    fieldSchema: assetType.fieldSchema as AssetFieldDef[],
  };
}

/**
 * Imports one or more asset type templates (a bare template or a bundle —
 * see src/lib/asset-type-templates.ts). Best-effort, not all-or-nothing: one
 * name collision doesn't abort the rest of the batch.
 */
export async function importAssetTypeTemplates(
  templatesJson: string,
): Promise<{ created: string[]; skipped: { name: string; reason: string }[] }> {
  await requirePermission("asset-type:manage");

  let raw: unknown;
  try {
    raw = JSON.parse(templatesJson);
  } catch {
    throw new Error("That's not valid JSON.");
  }
  const templates = parseAssetTypeTemplateInput(raw);

  const created: string[] = [];
  const skipped: { name: string; reason: string }[] = [];

  for (const template of templates) {
    try {
      await createAssetType({
        name: template.name,
        category: template.category ?? undefined,
        icon: template.icon ?? undefined,
        iconColor: template.iconColor ?? undefined,
        fieldSchema: template.fieldSchema,
      });
      created.push(template.name);
    } catch (err) {
      const isUniqueConflict =
        err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002";
      skipped.push({
        name: template.name,
        reason: isUniqueConflict
          ? "An asset type with this name already exists."
          : err instanceof Error
            ? err.message
            : "Couldn't import.",
      });
    }
  }

  return { created, skipped };
}

/** Bare, portable shape for one asset type — no id/timestamps/picture. */
export async function exportAssetTypeTemplate(assetTypeId: string): Promise<AssetTypeTemplate> {
  await requirePermission("asset-type:manage");
  const assetType = await prisma.assetType.findUniqueOrThrow({ where: { id: assetTypeId } });
  return toTemplate(assetType);
}

/** Packages several asset types into one shareable bundle file. */
export async function exportAssetTypeTemplateBundle(
  assetTypeIds: string[],
  bundleName?: string | null,
): Promise<AssetTypeTemplateBundle> {
  await requirePermission("asset-type:manage");
  const assetTypes = await prisma.assetType.findMany({ where: { id: { in: assetTypeIds } } });
  return {
    name: bundleName || null,
    templates: assetTypes.map(toTemplate),
  };
}
