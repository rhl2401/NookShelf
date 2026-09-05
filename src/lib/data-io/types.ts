import { z } from "zod";

// The normalized shape every export/import format round-trips through.
// Deliberately scoped to inventory structure — locations, asset types,
// assets, kits, and consumables — not people, roles, or transactional history
// (checkouts/audit log/notifications), which carry access-control and
// historical-integrity concerns that don't belong in a freeform import.

const assetFieldDefSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["TEXT", "NUMBER", "BOOLEAN", "DATE", "SELECT", "MULTISELECT", "UNIT_NUMBER"]),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  unit: z.string().optional(),
  unitOptions: z.array(z.string()).optional(),
});

export const locationRowSchema = z.object({
  // Full ancestor path joined by " / ", e.g. "House / Garage / Shelf 3" — the
  // natural key used to match existing locations and infer parents on import.
  path: z.string().min(1),
  notes: z.string().nullable().optional(),
});

export const assetTypeRowSchema = z.object({
  name: z.string().min(1),
  category: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  fieldSchema: z.array(assetFieldDefSchema).optional(),
});

export const assetRowSchema = z.object({
  assetTag: z.string().min(1),
  name: z.string().min(1),
  assetType: z.string().min(1),
  location: z.string().nullable().optional(), // full path, matches locationRowSchema.path
  assignedToEmail: z.string().nullable().optional(),
  parentAssetTag: z.string().nullable().optional(),
  status: z
    .enum(["IN_USE", "IN_STORAGE", "CHECKED_OUT", "RETIRED", "LOST", "DISPOSED"])
    .optional(),
  notes: z.string().nullable().optional(),
  purchaseDate: z.string().nullable().optional(), // ISO date, yyyy-mm-dd
  purchasePrice: z.union([z.number(), z.string()]).nullable().optional(),
  purchaseCurrency: z.string().nullable().optional(),
  vendor: z.string().nullable().optional(),
  warrantyExpiresAt: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export const kitRowSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  memberAssetTags: z.array(z.string()).optional(),
});

export const consumableRowSchema = z.object({
  name: z.string().min(1),
  category: z.string().nullable().optional(),
  quantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).nullable().optional(),
  location: z.string().nullable().optional(), // full path, matches locationRowSchema.path
});

export const exportBundleSchema = z.object({
  meta: z.object({
    exportedAt: z.string().optional(),
    version: z.literal(1),
  }),
  locations: z.array(locationRowSchema).default([]),
  assetTypes: z.array(assetTypeRowSchema).default([]),
  assets: z.array(assetRowSchema).default([]),
  kits: z.array(kitRowSchema).default([]),
  consumables: z.array(consumableRowSchema).default([]),
});

export type LocationRow = z.infer<typeof locationRowSchema>;
export type AssetTypeRow = z.infer<typeof assetTypeRowSchema>;
export type AssetRow = z.infer<typeof assetRowSchema>;
export type KitRow = z.infer<typeof kitRowSchema>;
export type ConsumableRow = z.infer<typeof consumableRowSchema>;
export type ExportBundle = z.infer<typeof exportBundleSchema>;

export const PATH_SEPARATOR = " / ";
