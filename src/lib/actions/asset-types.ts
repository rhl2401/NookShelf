"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { writeAudit } from "@/lib/audit";

const fieldDefSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Use letters, numbers, and underscores, starting with a letter."),
  label: z.string().min(1).max(80),
  type: z.enum(["TEXT", "NUMBER", "BOOLEAN", "DATE", "SELECT", "MULTISELECT", "UNIT_NUMBER"]),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  unit: z.string().max(20).optional(),
  unitOptions: z.array(z.string()).optional(),
});

const assetTypeSchema = z.object({
  name: z.string().min(1).max(80),
  category: z.string().max(80).optional(),
  icon: z.string().max(40).optional(),
  iconColor: z.string().max(20).optional(),
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
