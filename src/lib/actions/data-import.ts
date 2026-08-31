"use server";

import { requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { PATH_SEPARATOR, type ExportBundle } from "@/lib/data-io/types";
import type { Prisma, AssetStatus } from "@/generated/prisma/client";

export type ImportSummary = {
  assetTypes: { created: number; updated: number };
  locations: { created: number; updated: number };
  assets: { created: number; updated: number };
  kits: { created: number; updated: number };
  warnings: string[];
};

export async function importBundle(bundle: ExportBundle): Promise<ImportSummary> {
  const session = await requirePermission("settings:manage");
  const warnings: string[] = [];

  const summary = await prisma.$transaction(
    async (tx) => {
      // --- Asset types --------------------------------------------------
      const assetTypeIdByName = new Map<string, string>();
      let assetTypesCreated = 0;
      let assetTypesUpdated = 0;

      for (const row of bundle.assetTypes) {
        const existing = await tx.assetType.findUnique({ where: { name: row.name } });
        const data = {
          category: row.category || null,
          icon: row.icon || null,
          fieldSchema: (row.fieldSchema ?? []) as unknown as Prisma.InputJsonValue,
        };
        if (existing) {
          const updated = await tx.assetType.update({ where: { id: existing.id }, data });
          assetTypeIdByName.set(row.name, updated.id);
          assetTypesUpdated++;
        } else {
          const created = await tx.assetType.create({ data: { name: row.name, ...data } });
          assetTypeIdByName.set(row.name, created.id);
          assetTypesCreated++;
        }
      }
      // Asset types referenced by assets but not present in the bundle's own
      // assetTypes list still need to resolve against what's already in the DB.
      for (const row of bundle.assets) {
        if (assetTypeIdByName.has(row.assetType)) continue;
        const existing = await tx.assetType.findUnique({ where: { name: row.assetType } });
        if (existing) assetTypeIdByName.set(row.assetType, existing.id);
      }

      // --- Locations -------------------------------------------------------
      // Union of explicitly-listed paths and any path only referenced by an
      // asset's `location` field, so assets never point at an unresolved path.
      const explicitNotesByPath = new Map(bundle.locations.map((l) => [l.path, l.notes ?? null]));
      const allPaths = new Set<string>([
        ...bundle.locations.map((l) => l.path),
        ...bundle.assets.map((a) => a.location).filter((p): p is string => Boolean(p)),
      ]);

      const pathToId = new Map<string, string>();
      let locationsCreated = 0;
      let locationsUpdated = 0;

      async function resolvePath(path: string): Promise<string> {
        const cached = pathToId.get(path);
        if (cached) return cached;

        const segments = path.split(PATH_SEPARATOR);
        const name = segments[segments.length - 1].trim();
        const parentPath = segments.slice(0, -1).join(PATH_SEPARATOR);
        const parentId = parentPath ? await resolvePath(parentPath) : null;

        const existing = await tx.location.findFirst({ where: { name, parentId } });
        if (existing) {
          pathToId.set(path, existing.id);
          if (explicitNotesByPath.has(path)) {
            await tx.location.update({
              where: { id: existing.id },
              data: { notes: explicitNotesByPath.get(path) ?? null },
            });
            locationsUpdated++;
          }
          return existing.id;
        }

        const created = await tx.location.create({
          data: { name, parentId, notes: explicitNotesByPath.get(path) ?? null },
        });
        pathToId.set(path, created.id);
        locationsCreated++;
        return created.id;
      }

      for (const path of Array.from(allPaths).sort((a, b) => a.length - b.length)) {
        await resolvePath(path);
      }

      // --- Assets (pass 1: everything except parent links) -----------------
      const assetIdByTag = new Map<string, string>();
      let assetsCreated = 0;
      let assetsUpdated = 0;

      for (const row of bundle.assets) {
        const assetTypeId = assetTypeIdByName.get(row.assetType);
        if (!assetTypeId) {
          warnings.push(`Asset "${row.assetTag}": unknown asset type "${row.assetType}" — skipped.`);
          continue;
        }

        const locationId = row.location ? (pathToId.get(row.location) ?? null) : null;
        if (row.location && !locationId) {
          warnings.push(`Asset "${row.assetTag}": couldn't resolve location "${row.location}".`);
        }

        let assignedToId: string | null = null;
        if (row.assignedToEmail) {
          const person = await tx.person.findFirst({
            where: { email: row.assignedToEmail, status: { not: "MERGED" } },
          });
          if (person) assignedToId = person.id;
          else warnings.push(`Asset "${row.assetTag}": no person found with email "${row.assignedToEmail}" — left unassigned.`);
        }

        const tagIds: string[] = [];
        for (const tagName of row.tags ?? []) {
          const tag = await tx.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          });
          tagIds.push(tag.id);
        }

        const data = {
          name: row.name,
          assetTypeId,
          locationId,
          assignedToId,
          status: (row.status || "IN_STORAGE") as AssetStatus,
          notes: row.notes || null,
          purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : null,
          purchasePrice: row.purchasePrice != null ? String(row.purchasePrice) : null,
          purchaseCurrency: row.purchaseCurrency || null,
          vendor: row.vendor || null,
          warrantyExpiresAt: row.warrantyExpiresAt ? new Date(row.warrantyExpiresAt) : null,
          customFields: (row.customFields ?? {}) as Prisma.InputJsonValue,
        };

        const existing = await tx.asset.findUnique({ where: { assetTag: row.assetTag } });
        let assetId: string;
        if (existing) {
          await tx.asset.update({ where: { id: existing.id }, data });
          await tx.assetTag.deleteMany({ where: { assetId: existing.id } });
          assetId = existing.id;
          assetsUpdated++;
        } else {
          const created = await tx.asset.create({ data: { assetTag: row.assetTag, ...data } });
          assetId = created.id;
          assetsCreated++;
        }

        if (tagIds.length > 0) {
          await tx.assetTag.createMany({
            data: tagIds.map((tagId) => ({ assetId, tagId })),
            skipDuplicates: true,
          });
        }

        assetIdByTag.set(row.assetTag, assetId);
      }

      // --- Assets (pass 2: parent links, now that every tag has an id) -----
      for (const row of bundle.assets) {
        if (!row.parentAssetTag) continue;
        const assetId = assetIdByTag.get(row.assetTag);
        if (!assetId) continue; // this row was skipped in pass 1

        let parentId = assetIdByTag.get(row.parentAssetTag) ?? null;
        if (!parentId) {
          const parent = await tx.asset.findUnique({ where: { assetTag: row.parentAssetTag } });
          parentId = parent?.id ?? null;
        }
        if (!parentId) {
          warnings.push(
            `Asset "${row.assetTag}": parent asset "${row.parentAssetTag}" not found — left unlinked.`,
          );
          continue;
        }
        await tx.asset.update({ where: { id: assetId }, data: { parentAssetId: parentId } });
      }

      // --- Kits --------------------------------------------------------------
      let kitsCreated = 0;
      let kitsUpdated = 0;

      for (const row of bundle.kits) {
        const memberIds: string[] = [];
        for (const tag of row.memberAssetTags ?? []) {
          const id = assetIdByTag.get(tag) ?? (await tx.asset.findUnique({ where: { assetTag: tag } }))?.id;
          if (id) memberIds.push(id);
          else warnings.push(`Kit "${row.name}": asset "${tag}" not found — left out of the kit.`);
        }

        const existing = await tx.kit.findUnique({ where: { name: row.name } });
        let kitId: string;
        if (existing) {
          await tx.kit.update({ where: { id: existing.id }, data: { description: row.description || null } });
          kitId = existing.id;
          kitsUpdated++;
        } else {
          const created = await tx.kit.create({
            data: { name: row.name, description: row.description || null },
          });
          kitId = created.id;
          kitsCreated++;
        }

        await tx.kitMember.deleteMany({ where: { kitId } });
        if (memberIds.length > 0) {
          await tx.kitMember.createMany({
            data: memberIds.map((assetId) => ({ kitId, assetId })),
            skipDuplicates: true,
          });
        }
      }

      return {
        assetTypes: { created: assetTypesCreated, updated: assetTypesUpdated },
        locations: { created: locationsCreated, updated: locationsUpdated },
        assets: { created: assetsCreated, updated: assetsUpdated },
        kits: { created: kitsCreated, updated: kitsUpdated },
        warnings,
      };
    },
    { timeout: 120_000, maxWait: 30_000 },
  );

  await writeAudit({
    entityType: "Import",
    entityId: "bulk",
    action: "UPDATE",
    actorId: session.user.personId,
    after: summary,
  });

  return summary;
}
