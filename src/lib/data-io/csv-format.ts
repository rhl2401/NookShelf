import Papa from "papaparse";
import JSZip from "jszip";
import {
  exportBundleSchema,
  type ExportBundle,
  type LocationRow,
  type AssetTypeRow,
  type AssetRow,
  type KitRow,
} from "@/lib/data-io/types";
import { sanitizeRow } from "@/lib/data-io/sanitize-cell";

// Array/object fields don't fit plain CSV cells — arrays of plain strings are
// pipe-joined (matches the existing single-asset CSV export convention),
// structured data (custom field schemas/values) is JSON-encoded per cell.

function locationsToRows(locations: LocationRow[]) {
  return locations.map((l) => sanitizeRow({ path: l.path, notes: l.notes ?? "" }));
}

function assetTypesToRows(assetTypes: AssetTypeRow[]) {
  return assetTypes.map((t) =>
    sanitizeRow({
      name: t.name,
      category: t.category ?? "",
      icon: t.icon ?? "",
      fieldSchemaJson: JSON.stringify(t.fieldSchema ?? []),
    }),
  );
}

function assetsToRows(assets: AssetRow[]) {
  return assets.map((a) =>
    sanitizeRow({
      assetTag: a.assetTag,
      name: a.name,
      assetType: a.assetType,
      location: a.location ?? "",
      assignedToEmail: a.assignedToEmail ?? "",
      parentAssetTag: a.parentAssetTag ?? "",
      status: a.status ?? "",
      notes: a.notes ?? "",
      purchaseDate: a.purchaseDate ?? "",
      purchasePrice: a.purchasePrice != null ? String(a.purchasePrice) : "",
      purchaseCurrency: a.purchaseCurrency ?? "",
      vendor: a.vendor ?? "",
      warrantyExpiresAt: a.warrantyExpiresAt ?? "",
      tags: (a.tags ?? []).join("|"),
      customFieldsJson: JSON.stringify(a.customFields ?? {}),
    }),
  );
}

function kitsToRows(kits: KitRow[]) {
  return kits.map((k) =>
    sanitizeRow({
      name: k.name,
      description: k.description ?? "",
      memberAssetTags: (k.memberAssetTags ?? []).join("|"),
    }),
  );
}

export async function bundleToCsvZip(bundle: ExportBundle): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("locations.csv", Papa.unparse(locationsToRows(bundle.locations)));
  zip.file("asset-types.csv", Papa.unparse(assetTypesToRows(bundle.assetTypes)));
  zip.file("assets.csv", Papa.unparse(assetsToRows(bundle.assets)));
  zip.file("kits.csv", Papa.unparse(kitsToRows(bundle.kits)));
  zip.file(
    "README.txt",
    "Asset Management data export (CSV).\n\n" +
      "Four files: locations.csv, asset-types.csv, assets.csv, kits.csv.\n" +
      "- \"path\" / \"location\" columns use \" / \" to separate nested location names, e.g. \"House / Garage / Shelf 3\".\n" +
      "- \"tags\" / \"memberAssetTags\" columns are pipe-separated, e.g. \"usb|cable|black\".\n" +
      "- \"fieldSchemaJson\" / \"customFieldsJson\" columns hold JSON — edit carefully.\n" +
      "Re-zip these files together (same names, no subfolder) to re-import.\n",
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

function parseCsv<T extends Record<string, string>>(text: string): T[] {
  const result = Papa.parse<T>(text, { header: true, skipEmptyLines: true });
  return result.data;
}

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseJsonCell<T>(value: string | undefined, fallback: T): T {
  if (!value || !value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function csvZipToBundle(buffer: Buffer): Promise<ExportBundle> {
  const zip = await JSZip.loadAsync(buffer);

  async function readCsv<T extends Record<string, string>>(filename: string): Promise<T[]> {
    const file = zip.file(filename);
    if (!file) return [];
    return parseCsv<T>(await file.async("string"));
  }

  const [locationRows, assetTypeRows, assetRows, kitRows] = await Promise.all([
    readCsv<{ path: string; notes: string }>("locations.csv"),
    readCsv<{ name: string; category: string; icon: string; fieldSchemaJson: string }>(
      "asset-types.csv",
    ),
    readCsv<Record<string, string>>("assets.csv"),
    readCsv<{ name: string; description: string; memberAssetTags: string }>("kits.csv"),
  ]);

  const bundle: ExportBundle = {
    meta: { version: 1 },
    locations: locationRows
      .filter((r) => r.path)
      .map((r) => ({ path: r.path, notes: r.notes || null })),
    assetTypes: assetTypeRows
      .filter((r) => r.name)
      .map((r) => ({
        name: r.name,
        category: r.category || null,
        icon: r.icon || null,
        fieldSchema: parseJsonCell(r.fieldSchemaJson, []),
      })),
    assets: assetRows
      .filter((r) => r.assetTag)
      .map((r) => ({
        assetTag: r.assetTag,
        name: r.name,
        assetType: r.assetType,
        location: r.location || null,
        assignedToEmail: r.assignedToEmail || null,
        parentAssetTag: r.parentAssetTag || null,
        status: (r.status || undefined) as AssetRow["status"],
        notes: r.notes || null,
        purchaseDate: r.purchaseDate || null,
        purchasePrice: r.purchasePrice || null,
        purchaseCurrency: r.purchaseCurrency || null,
        vendor: r.vendor || null,
        warrantyExpiresAt: r.warrantyExpiresAt || null,
        tags: splitList(r.tags),
        customFields: parseJsonCell(r.customFieldsJson, {}),
      })),
    kits: kitRows
      .filter((r) => r.name)
      .map((r) => ({
        name: r.name,
        description: r.description || null,
        memberAssetTags: splitList(r.memberAssetTags),
      })),
  };

  return exportBundleSchema.parse(bundle);
}
