import "server-only";
import { prisma } from "@/lib/prisma";
import { isBgRemovalProvider, type BgRemovalProvider } from "@/lib/background-removal-shared";
import type { BgRemovalSettings } from "@/lib/background-removal";

const SETTINGS_ID = "singleton";

/**
 * Internal helper — NOT a server action (no "use server"), so it's never
 * directly callable from the client. It's the only place the raw API key
 * leaves the database; src/lib/actions/workspace-settings.ts's
 * getWorkspaceBgRemoval() (which IS client-reachable) deliberately only
 * exposes whether a key is set, not the key itself.
 */
export async function loadBgRemovalSettings(): Promise<BgRemovalSettings> {
  const settings = await prisma.workspaceSettings.findUnique({ where: { id: SETTINGS_ID } });
  const provider: BgRemovalProvider = isBgRemovalProvider(settings?.bgRemovalProvider)
    ? settings.bgRemovalProvider
    : "local";
  return { provider, apiKey: settings?.bgRemovalApiKey ?? null };
}
