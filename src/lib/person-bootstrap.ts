import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Ensures a User has a linked Person: matches an existing unclaimed Person by
 * email (e.g. one an admin created manually before this person ever logged
 * in), or creates a new one. The very first Person in the system becomes
 * Admin; everyone after that defaults to Member. Shared by real OAuth
 * sign-in (via the `createUser` adapter event) and the dev-only login below,
 * so both paths bootstrap identity identically.
 */
export async function ensurePersonForUser(user: {
  id: string;
  email: string | null;
  name: string | null;
}) {
  if (!user.email) return;

  const existingPerson = await prisma.person.findFirst({
    where: { email: user.email, userId: null, status: { not: "MERGED" } },
  });

  if (existingPerson) {
    await prisma.person.update({
      where: { id: existingPerson.id },
      data: { userId: user.id },
    });
    return;
  }

  const personCount = await prisma.person.count();
  const defaultRoleName = personCount === 0 ? "Admin" : "Member";
  const role = await prisma.role.findUnique({ where: { name: defaultRoleName } });

  await prisma.person.create({
    data: {
      name: user.name || user.email,
      email: user.email,
      userId: user.id,
      roles: role ? { create: [{ roleId: role.id }] } : undefined,
    },
  });
}
