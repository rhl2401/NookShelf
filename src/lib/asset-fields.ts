import { z } from "zod";

export type AssetFieldType =
  | "TEXT"
  | "NUMBER"
  | "BOOLEAN"
  | "DATE"
  | "SELECT"
  | "MULTISELECT"
  | "UNIT_NUMBER";

export type AssetFieldDef = {
  key: string;
  label: string;
  type: AssetFieldType;
  required?: boolean;
  options?: string[]; // for SELECT / MULTISELECT
  unit?: string; // default unit label for UNIT_NUMBER, e.g. "m", "V", "A", "W"
  unitOptions?: string[]; // selectable units, e.g. ["m", "ft"]
};

export const CABLE_FIELD_SCHEMA: AssetFieldDef[] = [
  {
    key: "category",
    label: "Category",
    type: "SELECT",
    required: true,
    options: [
      "USB",
      "HDMI",
      "DisplayPort",
      "Thunderbolt",
      "Power",
      "Ethernet",
      "Audio",
      "Coax",
      "Other",
    ],
  },
  { key: "connectorA", label: "Connector A", type: "TEXT", required: true },
  { key: "connectorB", label: "Connector B", type: "TEXT", required: true },
  {
    key: "protocols",
    label: "Protocol(s)",
    type: "MULTISELECT",
    options: [
      "USB 2.0",
      "USB 3.2 Gen1",
      "USB 3.2 Gen2",
      "USB4",
      "Thunderbolt 3",
      "Thunderbolt 4",
      "HDMI 1.4",
      "HDMI 2.0",
      "HDMI 2.1",
      "DisplayPort 1.4",
      "DisplayPort 2.1",
      "Gigabit Ethernet",
      "10G Ethernet",
    ],
  },
  {
    key: "dataSpeed",
    label: "Data speed",
    type: "UNIT_NUMBER",
    unit: "Gbps",
    unitOptions: ["Mbps", "Gbps"],
  },
  {
    key: "length",
    label: "Length",
    type: "UNIT_NUMBER",
    unit: "m",
    unitOptions: ["m", "ft", "cm"],
  },
  {
    key: "voltage",
    label: "Voltage",
    type: "UNIT_NUMBER",
    unit: "V",
  },
  {
    key: "amperage",
    label: "Amperage",
    type: "UNIT_NUMBER",
    unit: "A",
  },
  {
    key: "wattage",
    label: "Max wattage",
    type: "UNIT_NUMBER",
    unit: "W",
  },
  { key: "color", label: "Color", type: "TEXT" },
];

/** Validates a custom-fields payload against an AssetType's field schema, returning the cleaned object. */
export function validateCustomFields(
  schema: AssetFieldDef[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of schema) {
    const raw = values[field.key];
    const isEmpty = raw === undefined || raw === null || raw === "";

    if (isEmpty) {
      if (field.required) throw new Error(`"${field.label}" is required.`);
      continue;
    }

    switch (field.type) {
      case "TEXT":
      case "SELECT":
        result[field.key] = z.string().parse(raw);
        break;
      case "MULTISELECT":
        result[field.key] = z.array(z.string()).parse(raw);
        break;
      case "BOOLEAN":
        result[field.key] = z.boolean().parse(raw);
        break;
      case "DATE":
        result[field.key] = z.string().parse(raw);
        break;
      case "NUMBER":
        result[field.key] = z.number().parse(Number(raw));
        break;
      case "UNIT_NUMBER": {
        const obj = z
          .object({ value: z.number(), unit: z.string().optional() })
          .parse(raw);
        result[field.key] = obj;
        break;
      }
    }
  }

  return result;
}
