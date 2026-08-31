"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { writeAudit } from "@/lib/audit";

const checkoutSchema = z.object({
  borrowerId: z.string().min(1),
  dueAt: z.string().min(1),
  notes: z.string().max(1000).optional(),
});

const UNAVAILABLE_STATUSES = ["CHECKED_OUT", "RETIRED", "LOST", "DISPOSED"] as const;

export async function checkoutAsset(assetId: string, input: z.infer<typeof checkoutSchema>) {
  const session = await requirePermission("checkout:manage");
  const data = checkoutSchema.parse(input);

  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
  if (UNAVAILABLE_STATUSES.includes(asset.status as (typeof UNAVAILABLE_STATUSES)[number])) {
    throw new Error(`This asset is ${asset.status.toLowerCase().replace("_", " ")} and can't be checked out.`);
  }

  const checkout = await prisma.$transaction(async (tx) => {
    const created = await tx.checkout.create({
      data: {
        kind: "ASSET",
        assetId,
        borrowerId: data.borrowerId,
        dueAt: new Date(data.dueAt),
        notes: data.notes || null,
        items: { create: [{ assetId }] },
      },
    });
    await tx.asset.update({ where: { id: assetId }, data: { status: "CHECKED_OUT" } });
    return created;
  });

  await writeAudit({
    entityType: "Checkout",
    entityId: checkout.id,
    assetId,
    action: "CHECKOUT",
    actorId: session.user.personId,
    after: checkout,
  });

  revalidatePath("/checkouts");
  revalidatePath("/assets");
  revalidatePath(`/assets/${assetId}`);
  return checkout;
}

export async function checkoutKit(kitId: string, input: z.infer<typeof checkoutSchema>) {
  const session = await requirePermission("checkout:manage");
  const data = checkoutSchema.parse(input);

  const kit = await prisma.kit.findUniqueOrThrow({
    where: { id: kitId },
    include: { members: { include: { asset: true } } },
  });

  const unavailable = kit.members.filter((m) =>
    UNAVAILABLE_STATUSES.includes(m.asset.status as (typeof UNAVAILABLE_STATUSES)[number]),
  );
  if (unavailable.length > 0) {
    throw new Error(
      `${unavailable.map((m) => m.asset.name).join(", ")} unavailable — can't check out this kit.`,
    );
  }
  if (kit.members.length === 0) {
    throw new Error("This kit has no assets in it yet.");
  }

  const checkout = await prisma.$transaction(async (tx) => {
    const created = await tx.checkout.create({
      data: {
        kind: "KIT",
        kitId,
        borrowerId: data.borrowerId,
        dueAt: new Date(data.dueAt),
        notes: data.notes || null,
        items: { create: kit.members.map((m) => ({ assetId: m.assetId })) },
      },
    });
    await tx.asset.updateMany({
      where: { id: { in: kit.members.map((m) => m.assetId) } },
      data: { status: "CHECKED_OUT" },
    });
    return created;
  });

  await writeAudit({
    entityType: "Checkout",
    entityId: checkout.id,
    action: "CHECKOUT",
    actorId: session.user.personId,
    after: checkout,
  });

  revalidatePath("/checkouts");
  revalidatePath("/assets");
  revalidatePath(`/kits/${kitId}`);
  return checkout;
}

const returnSchema = z.object({
  items: z.array(
    z.object({
      assetId: z.string(),
      isMissing: z.boolean().optional(),
      isDamaged: z.boolean().optional(),
      conditionNote: z.string().max(500).optional(),
    }),
  ),
});

export async function returnCheckout(checkoutId: string, input: z.infer<typeof returnSchema>) {
  const session = await requirePermission("checkout:manage");
  const data = returnSchema.parse(input);

  const checkout = await prisma.checkout.findUniqueOrThrow({
    where: { id: checkoutId },
    include: { items: true },
  });
  if (checkout.status === "RETURNED") throw new Error("This checkout was already returned.");

  await prisma.$transaction(async (tx) => {
    for (const item of checkout.items) {
      const override = data.items.find((i) => i.assetId === item.assetId);
      await tx.checkoutItem.update({
        where: { id: item.id },
        data: {
          returnedAt: new Date(),
          isMissing: override?.isMissing ?? false,
          isDamaged: override?.isDamaged ?? false,
          conditionNote: override?.conditionNote || null,
        },
      });
      await tx.asset.update({
        where: { id: item.assetId },
        data: { status: override?.isMissing ? "LOST" : "IN_STORAGE" },
      });
    }
    await tx.checkout.update({
      where: { id: checkoutId },
      data: { status: "RETURNED", returnedAt: new Date() },
    });
  });

  await writeAudit({
    entityType: "Checkout",
    entityId: checkoutId,
    action: "CHECKIN",
    actorId: session.user.personId,
    after: data,
  });

  revalidatePath("/checkouts");
  revalidatePath("/assets");
  return { ok: true };
}
