import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Resolves the base origin to embed in QR codes / printed labels. Prefers the
 * workspace's configured Public URL (Settings → Public URL) — a reverse proxy
 * or container setup can make `req.url`'s origin resolve to an internal
 * bind address like 0.0.0.0 rather than the real domain, so it can't be
 * trusted as the sole source. Falls back to the request's own origin when
 * unset.
 */
export async function resolvePublicOrigin(req: Request): Promise<string> {
  const settings = await prisma.workspaceSettings.findUnique({
    where: { id: "singleton" },
    select: { publicUrl: true },
  });
  return settings?.publicUrl || new URL(req.url).origin;
}
