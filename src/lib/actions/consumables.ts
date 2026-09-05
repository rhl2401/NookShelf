"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { writeAudit } from "@/lib/audit";

const consumableSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().max(80).optional(),
  icon: z.string().max(40).optional(),
  iconColor: z.string().max(20).optional(),
  primaryPictureId: z.string().optional(),
  quantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).optional(),
  locationId: z.string().optional(),
});

export async function createConsumable(input: z.infer<typeof consumableSchema>) {
  const session = await requirePermission("consumable:manage");
  const data = consumableSchema.parse(input);

  const consumable = await prisma.consumable.create({
    data: {
      name: data.name,
      category: data.category || null,
      icon: data.icon || null,
      iconColor: data.iconColor || null,
      primaryPictureId: data.primaryPictureId || null,
      quantity: data.quantity,
      lowStockThreshold: data.lowStockThreshold ?? null,
      locationId: data.locationId || null,
    },
  });

  await writeAudit({
    entityType: "Consumable",
    entityId: consumable.id,
    action: "CREATE",
    actorId: session.user.personId,
    after: consumable,
  });

  revalidatePath("/consumables");
  return consumable;
}

export async function updateConsumable(
  consumableId: string,
  input: z.infer<typeof consumableSchema>,
) {
  const session = await requirePermission("consumable:manage");
  const data = consumableSchema.parse(input);

  const before = await prisma.consumable.findUniqueOrThrow({ where: { id: consumableId } });

  const consumable = await prisma.consumable.update({
    where: { id: consumableId },
    data: {
      name: data.name,
      category: data.category || null,
      icon: data.icon || null,
      iconColor: data.iconColor || null,
      primaryPictureId: data.primaryPictureId || null,
      quantity: data.quantity,
      lowStockThreshold: data.lowStockThreshold ?? null,
      locationId: data.locationId || null,
    },
  });

  await writeAudit({
    entityType: "Consumable",
    entityId: consumable.id,
    action: "UPDATE",
    actorId: session.user.personId,
    before,
    after: consumable,
  });

  revalidatePath("/consumables");
  return consumable;
}

export async function deleteConsumable(consumableId: string) {
  const session = await requirePermission("consumable:manage");
  const consumable = await prisma.consumable.findUniqueOrThrow({ where: { id: consumableId } });

  await prisma.consumable.delete({ where: { id: consumableId } });
  await writeAudit({
    entityType: "Consumable",
    entityId: consumableId,
    action: "DELETE",
    actorId: session.user.personId,
    before: consumable,
  });

  revalidatePath("/consumables");
}

/** Quick +/- stock adjustment for the list view — clamps at 0, never goes negative. */
export async function adjustConsumableQuantity(consumableId: string, delta: number) {
  const session = await requirePermission("consumable:manage");
  const before = await prisma.consumable.findUniqueOrThrow({ where: { id: consumableId } });
  const nextQuantity = Math.max(0, before.quantity + delta);

  const consumable = await prisma.consumable.update({
    where: { id: consumableId },
    data: { quantity: nextQuantity },
  });

  await writeAudit({
    entityType: "Consumable",
    entityId: consumable.id,
    action: "UPDATE",
    actorId: session.user.personId,
    before,
    after: consumable,
  });

  revalidatePath("/consumables");
  return consumable;
}
