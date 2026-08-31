"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";

const webhookSchema = z.object({
  url: z.string().url(),
  secret: z.string().max(200).optional(),
  events: z.array(z.string()).min(1),
  enabled: z.boolean().optional(),
});

export async function createWebhook(input: z.infer<typeof webhookSchema>) {
  await requirePermission("settings:manage");
  const data = webhookSchema.parse(input);
  const webhook = await prisma.webhookEndpoint.create({
    data: { url: data.url, secret: data.secret || null, events: data.events, enabled: data.enabled ?? true },
  });
  revalidatePath("/settings");
  return webhook;
}

export async function deleteWebhook(id: string) {
  await requirePermission("settings:manage");
  await prisma.webhookEndpoint.delete({ where: { id } });
  revalidatePath("/settings");
}

export async function toggleWebhook(id: string, enabled: boolean) {
  await requirePermission("settings:manage");
  await prisma.webhookEndpoint.update({ where: { id }, data: { enabled } });
  revalidatePath("/settings");
}
