"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireSession } from "@/lib/auth-helpers";
import { writeAudit } from "@/lib/audit";
import { processImageUpload, AVATAR_SIZE } from "@/lib/image-processing";
import { saveAvatarFile, deleteStoredFile } from "@/lib/storage";

const MAX_AVATAR_BYTES = 20 * 1024 * 1024;

async function requireSelfOrUserManage(personId: string) {
  const session = await requireSession();
  if (session.user.personId === personId) return session;
  return requirePermission("user:manage");
}

export async function uploadAvatar(personId: string, formData: FormData) {
  const session = await requireSelfOrUserManage(personId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file provided.");
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_AVATAR_BYTES) throw new Error("File is too large (max 20MB).");

  const before = await prisma.person.findUniqueOrThrow({ where: { id: personId } });
  const input = Buffer.from(await file.arrayBuffer());
  const { buffer } = await processImageUpload(input, AVATAR_SIZE);
  const relativePath = await saveAvatarFile(buffer);

  await prisma.person.update({
    where: { id: personId },
    data: { avatarPath: relativePath, avatarSizeBytes: buffer.byteLength },
  });
  if (before.avatarPath) await deleteStoredFile(before.avatarPath);

  await writeAudit({
    entityType: "Person",
    entityId: personId,
    action: "UPDATE",
    actorId: session.user.personId,
    after: { avatarUpdated: true },
  });

  revalidatePath("/settings");
  revalidatePath("/people");
}

export async function removeAvatar(personId: string) {
  const session = await requireSelfOrUserManage(personId);
  const person = await prisma.person.findUniqueOrThrow({ where: { id: personId } });
  if (!person.avatarPath) return;

  await prisma.person.update({
    where: { id: personId },
    data: { avatarPath: null, avatarSizeBytes: null },
  });
  await deleteStoredFile(person.avatarPath);

  await writeAudit({
    entityType: "Person",
    entityId: personId,
    action: "UPDATE",
    actorId: session.user.personId,
    after: { avatarUpdated: false },
  });

  revalidatePath("/settings");
  revalidatePath("/people");
}

const personSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")),
});

export async function createPerson(input: z.infer<typeof personSchema>) {
  const session = await requirePermission("user:manage");
  const data = personSchema.parse(input);

  const person = await prisma.person.create({
    data: { name: data.name, email: data.email || null },
  });

  await writeAudit({
    entityType: "Person",
    entityId: person.id,
    action: "CREATE",
    actorId: session.user.personId,
    after: person,
  });

  revalidatePath("/people");
  return person;
}

export async function updatePersonName(personId: string, name: string) {
  const session = await requirePermission("user:manage");
  const parsed = personSchema.pick({ name: true }).parse({ name });

  const before = await prisma.person.findUniqueOrThrow({ where: { id: personId } });
  await prisma.person.update({ where: { id: personId }, data: { name: parsed.name } });

  await writeAudit({
    entityType: "Person",
    entityId: personId,
    action: "UPDATE",
    actorId: session.user.personId,
    before: { name: before.name },
    after: { name: parsed.name },
  });

  revalidatePath("/people");
}

export async function updatePersonRoles(personId: string, roleIds: string[]) {
  const session = await requirePermission("user:manage");

  await prisma.$transaction([
    prisma.roleAssignment.deleteMany({ where: { personId } }),
    prisma.roleAssignment.createMany({
      data: roleIds.map((roleId) => ({ personId, roleId })),
      skipDuplicates: true,
    }),
  ]);

  await writeAudit({
    entityType: "Person",
    entityId: personId,
    action: "UPDATE",
    actorId: session.user.personId,
    after: { roleIds },
  });

  revalidatePath("/people");
}

export async function setPersonActive(personId: string, active: boolean) {
  const session = await requirePermission("user:manage");
  const person = await prisma.person.findUniqueOrThrow({ where: { id: personId } });

  await prisma.$transaction(async (tx) => {
    await tx.person.update({
      where: { id: personId },
      data: { status: active ? "ACTIVE" : "INACTIVE" },
    });
    if (person.userId) {
      await tx.user.update({ where: { id: person.userId }, data: { active } });
    }
  });

  await writeAudit({
    entityType: "Person",
    entityId: personId,
    action: "STATUS_CHANGE",
    actorId: session.user.personId,
    before: { status: person.status },
    after: { status: active ? "ACTIVE" : "INACTIVE" },
  });

  revalidatePath("/people");
}

export async function mergePersons(sourcePersonId: string, targetPersonId: string) {
  const session = await requirePermission("user:manage");
  if (sourcePersonId === targetPersonId) throw new Error("Can't merge a person into themself.");

  const [source, target] = await Promise.all([
    prisma.person.findUniqueOrThrow({ where: { id: sourcePersonId } }),
    prisma.person.findUniqueOrThrow({ where: { id: targetPersonId } }),
  ]);

  if (source.status === "MERGED") throw new Error("Source person was already merged.");
  if (source.userId && target.userId) {
    throw new Error("Both people already have a login — can't merge two active logins.");
  }

  const sourceRoles = await prisma.roleAssignment.findMany({ where: { personId: sourcePersonId } });

  await prisma.$transaction(async (tx) => {
    await tx.asset.updateMany({
      where: { assignedToId: sourcePersonId },
      data: { assignedToId: targetPersonId },
    });
    await tx.checkout.updateMany({
      where: { borrowerId: sourcePersonId },
      data: { borrowerId: targetPersonId },
    });
    await tx.attachment.updateMany({
      where: { uploadedById: sourcePersonId },
      data: { uploadedById: targetPersonId },
    });
    await tx.notification.updateMany({
      where: { personId: sourcePersonId },
      data: { personId: targetPersonId },
    });
    await tx.auditLogEntry.updateMany({
      where: { actorId: sourcePersonId },
      data: { actorId: targetPersonId },
    });

    for (const assignment of sourceRoles) {
      await tx.roleAssignment.upsert({
        where: { personId_roleId: { personId: targetPersonId, roleId: assignment.roleId } },
        update: {},
        create: { personId: targetPersonId, roleId: assignment.roleId },
      });
    }
    await tx.roleAssignment.deleteMany({ where: { personId: sourcePersonId } });

    if (source.userId && !target.userId) {
      const userId = source.userId;
      await tx.person.update({ where: { id: sourcePersonId }, data: { userId: null } });
      await tx.person.update({ where: { id: targetPersonId }, data: { userId } });
    }

    await tx.person.update({
      where: { id: sourcePersonId },
      data: { status: "MERGED", mergedIntoId: targetPersonId },
    });
  });

  await writeAudit({
    entityType: "Person",
    entityId: targetPersonId,
    action: "MERGE",
    actorId: session.user.personId,
    before: { mergedFromPersonId: sourcePersonId, mergedFromName: source.name },
    after: { survivingPersonId: targetPersonId },
  });

  revalidatePath("/people");
}
