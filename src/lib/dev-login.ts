import "server-only";
import { prisma } from "@/lib/prisma";
import { ensurePersonForUser } from "@/lib/person-bootstrap";

/**
 * Dev-only sign-in: NODE_ENV must not be "production" AND the operator must
 * explicitly opt in with AUTH_DEV_LOGIN=true. The Docker image always sets
 * NODE_ENV=production, so this is structurally disabled there regardless of
 * how AUTH_DEV_LOGIN is set — it only ever activates under `next dev`.
 */
export function isDevLoginEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_LOGIN === "true";
}

/** Finds or creates a User (and its linked Person) for the given email — used by the dev Credentials provider. */
export async function findOrCreateDevUser(email: string, name: string) {
  const normalizedEmail = email.trim().toLowerCase();
  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    user = await prisma.user.create({
      data: { email: normalizedEmail, name: name.trim() || normalizedEmail, emailVerified: new Date() },
    });
    await ensurePersonForUser(user);
  }

  return user;
}
