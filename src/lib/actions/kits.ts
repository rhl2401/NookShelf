"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { writeAudit } from "@/lib/audit";

const kitSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  assetIds: z.array(z.string()).optional(),
});

export async function createKit(input: z.infer<typeof kitSchema>) {
  const session = await requirePermission("kit:manage");
  const data = kitSchema.parse(input);

  const kit = await prisma.kit.create({
    data: {
      name: data.name,
      description: data.description || null,
      members: { create: (data.assetIds ?? []).map((assetId) => ({ assetId })) },
    },
  });

  await writeAudit({
    entityType: "Kit",
    entityId: kit.id,
    action: "CREATE",
    actorId: session.user.personId,
    after: kit,
  });

  revalidatePath("/kits");
  return kit;
}

export async function updateKit(
  kitId: string,
  input: { name: string; description?: string; assetIds: string[] },
) {
  const session = await requirePermission("kit:manage");
  const data = kitSchema.parse(input);

  const before = await prisma.kit.findUniqueOrThrow({ where: { id: kitId } });

  const kit = await prisma.$transaction(async (tx) => {
    await tx.kit.update({
      where: { id: kitId },
      data: { name: data.name, description: data.description || null },
    });
    await tx.kitMember.deleteMany({ where: { kitId } });
    await tx.kitMember.createMany({
      data: (data.assetIds ?? []).map((assetId) => ({ kitId, assetId })),
      skipDuplicates: true,
    });
    return tx.kit.findUniqueOrThrow({ where: { id: kitId } });
  });

  await writeAudit({
    entityType: "Kit",
    entityId: kit.id,
    action: "UPDATE",
    actorId: session.user.personId,
    before,
    after: kit,
  });

  revalidatePath("/kits");
  revalidatePath(`/kits/${kitId}`);
  return kit;
}

export async function deleteKit(kitId: string) {
  const session = await requirePermission("kit:manage");
  const kit = await prisma.kit.findUniqueOrThrow({
    where: { id: kitId },
    include: { checkouts: { where: { status: "OUT" } } },
  });

  if (kit.checkouts.length > 0) {
    throw new Error("This kit is currently checked out — check it in first.");
  }

  await prisma.kit.delete({ where: { id: kitId } });
  await writeAudit({
    entityType: "Kit",
    entityId: kitId,
    action: "DELETE",
    actorId: session.user.personId,
    before: kit,
  });

  revalidatePath("/kits");
}
