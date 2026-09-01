// Pure, client-safe helpers for the workspace accent color — no server-only deps.

/** Tailwind's 500-shade hex value for each icon-color palette key (src/lib/icon-colors.ts). */
export const ICON_COLOR_HEX: Record<string, string> = {
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  yellow: "#eab308",
  green: "#22c55e",
  emerald: "#10b981",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  sky: "#0ea5e9",
  blue: "#3b82f6",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  purple: "#a855f7",
  fuchsia: "#d946ef",
  pink: "#ec4899",
  rose: "#f43f5e",
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(value: string): boolean {
  return HEX_RE.test(value);
}

/** Reverse-lookup: which palette key (if any) a stored hex matches, so swatches can show as selected. */
export function hexToIconColorKey(hex: string | null): string | null {
  if (!hex) return null;
  const normalized = hex.toLowerCase();
  return Object.keys(ICON_COLOR_HEX).find((k) => ICON_COLOR_HEX[k] === normalized) ?? null;
}

/** WCAG relative luminance, used to pick a readable foreground for an arbitrary accent color. */
export function contrastForeground(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  // Matches the app's existing near-black/near-white foreground tokens rather than pure #000/#fff.
  return luminance > 0.5 ? "#0a0a0a" : "#fafafa";
}
