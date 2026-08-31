import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Permission } from "@/lib/permissions";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

/** Resolves the current session and throws if there is none. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new AuthError("Not signed in", 401);
  if (!session.user.active) throw new AuthError("Account is deactivated", 403);
  return session;
}

/** Resolves the current session and throws unless it carries the given permission. */
export async function requirePermission(permission: Permission) {
  const session = await requireSession();
  if (!session.user.permissions.includes(permission)) {
    throw new AuthError(`Missing permission: ${permission}`, 403);
  }
  return session;
}

/** Resolves the current Person record, or null if the session has none yet. */
export async function getCurrentPerson() {
  const session = await auth();
  if (!session?.user?.personId) return null;
  return prisma.person.findUnique({ where: { id: session.user.personId } });
}
