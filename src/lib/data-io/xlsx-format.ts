import ExcelJS from "exceljs";
import {
  exportBundleSchema,
  type ExportBundle,
  type AssetRow,
} from "@/lib/data-io/types";
import { sanitizeRow } from "@/lib/data-io/sanitize-cell";

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: string[],
  rows: Array<Record<string, string>>,
) {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns.map((key) => ({ header: key, key, width: 22 }));
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
  return sheet;
}

export async function bundleToXlsx(bundle: ExportBundle): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NookShelf";
  workbook.created = new Date();

  addSheet(
    workbook,
    "Locations",
    ["path", "notes"],
    bundle.locations.map((l) => sanitizeRow({ path: l.path, notes: l.notes ?? "" })),
  );

  addSheet(
    workbook,
    "AssetTypes",
    ["name", "category", "icon", "fieldSchemaJson"],
    bundle.assetTypes.map((t) =>
      sanitizeRow({
        name: t.name,
        category: t.category ?? "",
        icon: t.icon ?? "",
        fieldSchemaJson: JSON.stringify(t.fieldSchema ?? []),
      }),
    ),
  );

  addSheet(
    workbook,
    "Assets",
    [
      "assetTag",
      "name",
      "assetType",
      "location",
      "assignedToEmail",
      "parentAssetTag",
      "status",
      "notes",
      "purchaseDate",
      "purchasePrice",
      "purchaseCurrency",
      "vendor",
      "warrantyExpiresAt",
      "tags",
      "customFieldsJson",
    ],
    bundle.assets.map((a) =>
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
    ),
  );

  addSheet(
    workbook,
    "Kits",
    ["name", "description", "memberAssetTags"],
    bundle.kits.map((k) =>
      sanitizeRow({
        name: k.name,
        description: k.description ?? "",
        memberAssetTags: (k.memberAssetTags ?? []).join("|"),
      }),
    ),
  );

  addSheet(
    workbook,
    "Consumables",
    ["name", "category", "quantity", "lowStockThreshold", "location"],
    bundle.consumables.map((c) =>
      sanitizeRow({
        name: c.name,
        category: c.category ?? "",
        quantity: String(c.quantity ?? 0),
        lowStockThreshold: c.lowStockThreshold != null ? String(c.lowStockThreshold) : "",
        location: c.location ?? "",
      }),
    ),
  );

  const readme = workbook.addWorksheet("README");
  readme.getColumn(1).width = 100;
  [
    "NookShelf data export (XLSX).",
    "",
    "Sheets: Locations, AssetTypes, Assets, Kits, Consumables.",
    '"path" / "location" columns use " / " to separate nested location names, e.g. "House / Garage / Shelf 3".',
    '"tags" / "memberAssetTags" columns are pipe-separated, e.g. "usb|cable|black".',
    '"fieldSchemaJson" / "customFieldsJson" columns hold JSON — edit carefully.',
    "Keep the sheet names exactly as above to re-import this file.",
  ].forEach((line, i) => (readme.getCell(i + 1, 1).value = line));

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

function readSheetAsObjects(sheet: ExcelJS.Worksheet | undefined): Record<string, string>[] {
  if (!sheet) return [];
  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? "").trim();
  });

  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, string> = {};
    let hasValue = false;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      const value = cell.value;
      const text = value == null ? "" : String(value);
      if (text) hasValue = true;
      obj[header] = text;
    });
    if (hasValue) rows.push(obj);
  });
  return rows;
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

export async function xlsxToBundle(buffer: Buffer): Promise<ExportBundle> {
  const workbook = new ExcelJS.Workbook();
  // exceljs's bundled types pin an older non-generic `Buffer` shape that
  // doesn't structurally match @types/node's current generic Buffer.
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  const locationRows = readSheetAsObjects(workbook.getWorksheet("Locations"));
  const assetTypeRows = readSheetAsObjects(workbook.getWorksheet("AssetTypes"));
  const assetRows = readSheetAsObjects(workbook.getWorksheet("Assets"));
  const kitRows = readSheetAsObjects(workbook.getWorksheet("Kits"));
  const consumableRows = readSheetAsObjects(workbook.getWorksheet("Consumables"));

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
    consumables: consumableRows
      .filter((r) => r.name)
      .map((r) => ({
        name: r.name,
        category: r.category || null,
        quantity: r.quantity ? Number(r.quantity) : 0,
        lowStockThreshold: r.lowStockThreshold ? Number(r.lowStockThreshold) : null,
        location: r.location || null,
      })),
  };

  return exportBundleSchema.parse(bundle);
}
