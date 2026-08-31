import "server-only";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { dispatchWebhooks } from "@/lib/webhooks";
import type { NotificationType } from "@/generated/prisma/client";

/** Creates a notification (skipping if one with the same dedupeKey already exists), and fans it out to email + webhooks. */
export async function notify(params: {
  personId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  dedupeKey?: string;
}) {
  if (params.dedupeKey) {
    const existing = await prisma.notification.findUnique({
      where: { dedupeKey: params.dedupeKey },
    });
    if (existing) return existing;
  }

  const person = await prisma.person.findUnique({ where: { id: params.personId } });
  if (!person) return null;

  const notification = await prisma.notification.create({
    data: {
      personId: params.personId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link,
      dedupeKey: params.dedupeKey,
    },
  });

  if (person.email && person.emailNotificationsEnabled) {
    await sendEmail(person.email, params.title, params.body ?? params.title).catch(() => {});
  }
  await dispatchWebhooks(params.type, {
    title: params.title,
    body: params.body,
    link: params.link,
  });

  return notification;
}

/** Scans for warranty expirations and checkout due-dates/overdue, creating notifications as needed. */
export async function runNotificationChecks() {
  const now = new Date();
  const warrantyHorizon = addDays(now, 30);
  const dueSoonHorizon = addDays(now, 2);

  const expiringAssets = await prisma.asset.findMany({
    where: { warrantyExpiresAt: { gte: now, lte: warrantyHorizon }, assignedToId: { not: null } },
  });
  for (const asset of expiringAssets) {
    if (!asset.assignedToId) continue;
    await notify({
      personId: asset.assignedToId,
      type: "WARRANTY_EXPIRING",
      title: `Warranty expiring soon: ${asset.name}`,
      body: `Warranty expires ${asset.warrantyExpiresAt?.toLocaleDateString()}.`,
      link: `/assets/${asset.id}`,
      dedupeKey: `warranty:${asset.id}`,
    });
  }

  const dueSoonCheckouts = await prisma.checkout.findMany({
    where: { status: "OUT", dueAt: { gte: now, lte: dueSoonHorizon } },
    include: { asset: true, kit: true },
  });
  for (const checkout of dueSoonCheckouts) {
    const label = checkout.asset?.name ?? checkout.kit?.name ?? "your checkout";
    await notify({
      personId: checkout.borrowerId,
      type: "CHECKOUT_DUE_SOON",
      title: `Due back soon: ${label}`,
      body: `Due back ${checkout.dueAt.toLocaleDateString()}.`,
      link: checkout.asset ? `/assets/${checkout.assetId}` : `/kits/${checkout.kitId}`,
      dedupeKey: `checkout-due:${checkout.id}`,
    });
  }

  const overdueCheckouts = await prisma.checkout.findMany({
    where: { status: "OUT", dueAt: { lt: now } },
    include: { asset: true, kit: true },
  });
  for (const checkout of overdueCheckouts) {
    const label = checkout.asset?.name ?? checkout.kit?.name ?? "your checkout";
    await notify({
      personId: checkout.borrowerId,
      type: "CHECKOUT_OVERDUE",
      title: `Overdue: ${label}`,
      body: `Was due back ${checkout.dueAt.toLocaleDateString()}.`,
      link: checkout.asset ? `/assets/${checkout.assetId}` : `/kits/${checkout.kitId}`,
      dedupeKey: `checkout-overdue:${checkout.id}`,
    });
  }
}
