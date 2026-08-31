import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@/generated/prisma/client";

export async function writeAudit(params: {
  entityType: string;
  entityId: string;
  action: AuditAction;
  actorId?: string | null;
  assetId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLogEntry.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      actorId: params.actorId ?? null,
      assetId: params.assetId ?? null,
      before: params.before === undefined ? undefined : (params.before as object),
      after: params.after === undefined ? undefined : (params.after as object),
    },
  });
}
