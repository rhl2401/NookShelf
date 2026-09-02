"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { isBackgroundShadeKey } from "@/lib/background-shades";

/** Sets the caller's own background shade preference. Pass null to fall back to the workspace default. */
export async function setMyBackgroundShade(shade: string | null) {
  const session = await requireSession();
  if (!session.user.personId) throw new Error("No person record for this account.");
  if (shade !== null && !isBackgroundShadeKey(shade)) throw new Error("Invalid background shade.");

  await prisma.person.update({
    where: { id: session.user.personId },
    data: { backgroundShade: shade },
  });

  revalidatePath("/", "layout");
}
