import { z } from "zod";
import {
  fieldDefSchema,
  CABLE_FIELD_SCHEMA,
  VEHICLE_FIELD_SCHEMA,
  BATTERY_FIELD_SCHEMA,
} from "@/lib/asset-fields";

/**
 * Portable, shareable shape for an Asset Type — deliberately excludes id,
 * timestamps, and primaryPictureId (a Picture is a workspace-local binary
 * upload, not something that belongs in JSON meant to be pasted into a forum
 * post or handed to another workspace). Icon is just a name + palette key,
 * so it's fully portable as plain text.
 */
export const AssetTypeTemplateSchema = z.object({
  name: z.string().min(1).max(80),
  category: z.string().max(80).nullable().optional(),
  icon: z.string().max(40).nullable().optional(),
  iconColor: z.string().max(20).nullable().optional(),
  fieldSchema: z.array(fieldDefSchema),
});
export type AssetTypeTemplate = z.infer<typeof AssetTypeTemplateSchema>;

/** A bundle packages several templates into one shareable file, with an optional label. */
export const AssetTypeTemplateBundleSchema = z.object({
  name: z.string().max(80).nullable().optional(),
  templates: z.array(AssetTypeTemplateSchema).min(1),
});
export type AssetTypeTemplateBundle = z.infer<typeof AssetTypeTemplateBundleSchema>;

/**
 * Accepts either a bare single-template object or a bundle object (anything
 * with a `templates` array) and normalizes to a flat list — the one entry
 * point the import UI and action use regardless of what shape was
 * pasted/uploaded.
 */
export function parseAssetTypeTemplateInput(raw: unknown): AssetTypeTemplate[] {
  const bundle = AssetTypeTemplateBundleSchema.safeParse(raw);
  if (bundle.success) return bundle.data.templates;

  const single = AssetTypeTemplateSchema.safeParse(raw);
  if (single.success) return [single.data];

  throw new Error("That doesn't look like a valid asset type template.");
}

const CABLE_TEMPLATE: AssetTypeTemplate = {
  name: "Cable",
  category: "Cables",
  icon: "cable",
  iconColor: null,
  fieldSchema: CABLE_FIELD_SCHEMA,
};

const VEHICLE_TEMPLATE: AssetTypeTemplate = {
  name: "Vehicle",
  category: "Vehicles",
  icon: "car",
  iconColor: null,
  fieldSchema: VEHICLE_FIELD_SCHEMA,
};

const BATTERY_TEMPLATE: AssetTypeTemplate = {
  name: "Battery",
  category: "Electronics",
  icon: "battery",
  iconColor: null,
  fieldSchema: BATTERY_FIELD_SCHEMA,
};

/** Starter templates shipped with the app — not auto-created, just offered in the import dialog. */
export const STARTER_TEMPLATES: AssetTypeTemplate[] = [
  CABLE_TEMPLATE,
  VEHICLE_TEMPLATE,
  BATTERY_TEMPLATE,
];
