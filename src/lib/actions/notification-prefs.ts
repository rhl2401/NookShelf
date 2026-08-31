"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";

export async function setEmailNotificationsEnabled(enabled: boolean) {
  const session = await requireSession();
  if (!session.user.personId) throw new Error("No person record for this account.");

  await prisma.person.update({
    where: { id: session.user.personId },
    data: { emailNotificationsEnabled: enabled },
  });

  revalidatePath("/settings");
}
