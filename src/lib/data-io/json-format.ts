import { exportBundleSchema, type ExportBundle } from "@/lib/data-io/types";

export function bundleToJson(bundle: ExportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export function jsonToBundle(text: string): ExportBundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const result = exportBundleSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid import file: ${result.error.issues[0]?.message ?? "schema mismatch"}`);
  }
  return result.data;
}
