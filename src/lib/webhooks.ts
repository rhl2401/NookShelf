import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/generated/prisma/client";

export async function dispatchWebhooks(
  type: NotificationType,
  payload: { title: string; body?: string | null; link?: string | null },
) {
  const endpoints = await prisma.webhookEndpoint.findMany({ where: { enabled: true } });
  const targets = endpoints.filter((e) => e.events.includes("*") || e.events.includes(type));

  await Promise.allSettled(
    targets.map(async (endpoint) => {
      const body = JSON.stringify({ type, ...payload, sentAt: new Date().toISOString() });
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (endpoint.secret) {
        headers["X-Signature"] = crypto
          .createHmac("sha256", endpoint.secret)
          .update(body)
          .digest("hex");
      }
      await fetch(endpoint.url, { method: "POST", headers, body }).catch(() => {});
    }),
  );
}
