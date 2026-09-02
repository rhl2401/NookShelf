// Guards against CSV/formula injection: a cell value opened by a spreadsheet
// app that starts with one of these characters can be interpreted as a
// formula (e.g. "=HYPERLINK(...)"). Prefixing with a single quote neutralizes
// it while keeping the value visible in the exported file.
const RISKY_PREFIX = /^[=+\-@\t\r]/;

export function sanitizeSpreadsheetCell(value: string): string {
  return RISKY_PREFIX.test(value) ? `'${value}` : value;
}

export function sanitizeRow<T extends Record<string, string>>(row: T): T {
  const out = {} as T;
  for (const key of Object.keys(row) as Array<keyof T>) {
    const value = row[key];
    out[key] = (typeof value === "string" ? sanitizeSpreadsheetCell(value) : value) as T[typeof key];
  }
  return out;
}
