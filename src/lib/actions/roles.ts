"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { writeAudit } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";

const roleSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(300).optional(),
  permissions: z.array(z.enum(PERMISSIONS)),
});

export async function createRole(input: z.infer<typeof roleSchema>) {
  const session = await requirePermission("role:manage");
  const data = roleSchema.parse(input);

  const role = await prisma.role.create({ data });
  await writeAudit({
    entityType: "Role",
    entityId: role.id,
    action: "CREATE",
    actorId: session.user.personId,
    after: role,
  });

  revalidatePath("/roles");
  return role;
}

export async function updateRole(roleId: string, input: z.infer<typeof roleSchema>) {
  const session = await requirePermission("role:manage");
  const data = roleSchema.parse(input);

  const before = await prisma.role.findUniqueOrThrow({ where: { id: roleId } });
  const role = await prisma.role.update({ where: { id: roleId }, data });

  await writeAudit({
    entityType: "Role",
    entityId: role.id,
    action: "UPDATE",
    actorId: session.user.personId,
    before,
    after: role,
  });

  revalidatePath("/roles");
  return role;
}

export async function deleteRole(roleId: string) {
  const session = await requirePermission("role:manage");
  const role = await prisma.role.findUniqueOrThrow({ where: { id: roleId } });
  if (role.isSystem) throw new Error("System roles can't be deleted.");

  await prisma.role.delete({ where: { id: roleId } });
  await writeAudit({
    entityType: "Role",
    entityId: roleId,
    action: "DELETE",
    actorId: session.user.personId,
    before: role,
  });

  revalidatePath("/roles");
}
