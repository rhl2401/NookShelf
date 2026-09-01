"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { writeAudit } from "@/lib/audit";
import { isAncestorOrSelf } from "@/lib/locations";
import { generateLocationCode } from "@/lib/location-code";

const locationSchema = z.object({
  name: z.string().min(1).max(120),
  parentId: z.string().nullable().optional(),
  code: z.string().max(40).nullable().optional(),
  icon: z.string().nullable().optional(),
  iconColor: z.string().nullable().optional(),
  primaryPictureId: z.string().nullable().optional(),
  notes: z.string().max(2000).optional(),
});

export async function createLocation(input: z.infer<typeof locationSchema>) {
  const session = await requirePermission("location:manage");
  const data = locationSchema.parse(input);

  const location = await prisma.location.create({
    data: {
      name: data.name,
      parentId: data.parentId || null,
      code: data.code?.trim() || generateLocationCode(),
      icon: data.icon || null,
      iconColor: data.iconColor || null,
      primaryPictureId: data.primaryPictureId || null,
      notes: data.notes || null,
    },
  });

  await writeAudit({
    entityType: "Location",
    entityId: location.id,
    action: "CREATE",
    actorId: session.user.personId,
    after: location,
  });

  revalidatePath("/locations");
  return location;
}

export async function updateLocation(
  locationId: string,
  input: Partial<z.infer<typeof locationSchema>>,
) {
  const session = await requirePermission("location:manage");
  const data = locationSchema.partial().parse(input);

  if (data.parentId) {
    if (data.parentId === locationId) throw new Error("A location can't be its own parent.");
    const wouldCycle = await isAncestorOrSelf(locationId, data.parentId);
    if (wouldCycle) throw new Error("Can't move a location under one of its own children.");
  }

  const before = await prisma.location.findUniqueOrThrow({ where: { id: locationId } });
  const location = await prisma.location.update({
    where: { id: locationId },
    data: {
      name: data.name,
      parentId: data.parentId === undefined ? undefined : data.parentId || null,
      code: data.code === undefined ? undefined : data.code?.trim() || null,
      icon: data.icon === undefined ? undefined : data.icon || null,
      iconColor: data.iconColor === undefined ? undefined : data.iconColor || null,
      primaryPictureId:
        data.primaryPictureId === undefined ? undefined : data.primaryPictureId || null,
      notes: data.notes,
    },
  });

  await writeAudit({
    entityType: "Location",
    entityId: location.id,
    action: data.parentId !== undefined ? "MOVE" : "UPDATE",
    actorId: session.user.personId,
    before,
    after: location,
  });

  revalidatePath("/locations");
  return location;
}

export async function deleteLocation(
  locationId: string,
  opts: { reassignAssetsTo?: string | null } = {},
) {
  const session = await requirePermission("location:manage");

  const location = await prisma.location.findUniqueOrThrow({
    where: { id: locationId },
    include: { _count: { select: { children: true, assets: true } } },
  });

  if (location._count.children > 0) {
    throw new Error("Move or delete child locations first.");
  }
  if (location._count.assets > 0) {
    if (opts.reassignAssetsTo === undefined) {
      throw new Error(
        `This location still has ${location._count.assets} asset(s). Reassign them first.`,
      );
    }
    await prisma.asset.updateMany({
      where: { locationId },
      data: { locationId: opts.reassignAssetsTo },
    });
  }

  await prisma.location.delete({ where: { id: locationId } });

  await writeAudit({
    entityType: "Location",
    entityId: locationId,
    action: "DELETE",
    actorId: session.user.personId,
    before: location,
  });

  revalidatePath("/locations");
}
