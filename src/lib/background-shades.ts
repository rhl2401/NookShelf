// Pure, client-safe constants for the 5-shade background picker — no server-only deps.
// Each shade shares the same lightness structure as the app's surface tokens
// (see :root in globals.css) and only varies hue/chroma, so switching shades
// never changes contrast — just the white-point's color temperature.

export type BackgroundShadeKey = "frost" | "cool" | "neutral" | "warm" | "cream";

const SHADES: Record<BackgroundShadeKey, { label: string; hue: number; intensity: number }> = {
  frost: { label: "Frost", hue: 240, intensity: 0.008 },
  cool: { label: "Cool", hue: 220, intensity: 0.006 },
  neutral: { label: "Neutral", hue: 0, intensity: 0 },
  warm: { label: "Warm", hue: 80, intensity: 0.012 },
  cream: { label: "Cream", hue: 77.3, intensity: 0.0197 },
};

export const BACKGROUND_SHADE_KEYS = Object.keys(SHADES) as BackgroundShadeKey[];
export const DEFAULT_BACKGROUND_SHADE: BackgroundShadeKey = "cream";

export function isBackgroundShadeKey(value: string | null | undefined): value is BackgroundShadeKey {
  return !!value && value in SHADES;
}

export function backgroundShadeLabel(key: BackgroundShadeKey): string {
  return SHADES[key].label;
}

/** A representative swatch color for pickers — matches the --background tier. */
export function backgroundShadeSwatch(key: BackgroundShadeKey): string {
  const { hue, intensity } = SHADES[key];
  return `oklch(0.9736 ${intensity} ${hue})`;
}

/** Full set of CSS custom property overrides for this shade, merged onto <html> inline style. */
export function backgroundShadeStyle(key: BackgroundShadeKey): Record<string, string> {
  const { hue, intensity } = SHADES[key];
  const surface = `oklch(0.9736 ${intensity} ${hue})`;
  const secondary = `oklch(0.97 ${intensity * 1.015} ${hue})`;
  const sidebar = `oklch(0.985 ${intensity * 0.76} ${hue})`;
  const border = `oklch(0.922 ${intensity * 1.27} ${hue})`;
  return {
    "--background": surface,
    "--card": surface,
    "--popover": surface,
    "--secondary": secondary,
    "--muted": secondary,
    "--accent": secondary,
    "--sidebar": sidebar,
    "--sidebar-accent": secondary,
    "--border": border,
    "--input": border,
    "--sidebar-border": border,
  };
}
