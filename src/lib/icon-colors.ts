export type IconColorKey = (typeof ICON_COLORS)[number]["key"];

export type IconColor = {
  key: string;
  label: string;
  /** Small round swatch shown in the picker. */
  swatch: string;
  /** Tinted badge background behind the icon glyph. */
  bg: string;
  /** Icon glyph color, paired with `bg`. */
  fg: string;
};

// A simple, fixed 16-color palette. Every class below is a full literal string
// (not built with template interpolation) so Tailwind's static scan picks it up.
export const ICON_COLORS: IconColor[] = [
  { key: "red", label: "Red", swatch: "bg-red-500", bg: "bg-red-100 dark:bg-red-950/50", fg: "text-red-600 dark:text-red-400" },
  { key: "orange", label: "Orange", swatch: "bg-orange-500", bg: "bg-orange-100 dark:bg-orange-950/50", fg: "text-orange-600 dark:text-orange-400" },
  { key: "amber", label: "Amber", swatch: "bg-amber-500", bg: "bg-amber-100 dark:bg-amber-950/50", fg: "text-amber-600 dark:text-amber-400" },
  { key: "yellow", label: "Yellow", swatch: "bg-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-950/50", fg: "text-yellow-600 dark:text-yellow-400" },
  { key: "green", label: "Green", swatch: "bg-green-500", bg: "bg-green-100 dark:bg-green-950/50", fg: "text-green-600 dark:text-green-400" },
  { key: "emerald", label: "Emerald", swatch: "bg-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-950/50", fg: "text-emerald-600 dark:text-emerald-400" },
  { key: "teal", label: "Teal", swatch: "bg-teal-500", bg: "bg-teal-100 dark:bg-teal-950/50", fg: "text-teal-600 dark:text-teal-400" },
  { key: "cyan", label: "Cyan", swatch: "bg-cyan-500", bg: "bg-cyan-100 dark:bg-cyan-950/50", fg: "text-cyan-600 dark:text-cyan-400" },
  { key: "sky", label: "Sky", swatch: "bg-sky-500", bg: "bg-sky-100 dark:bg-sky-950/50", fg: "text-sky-600 dark:text-sky-400" },
  { key: "blue", label: "Blue", swatch: "bg-blue-500", bg: "bg-blue-100 dark:bg-blue-950/50", fg: "text-blue-600 dark:text-blue-400" },
  { key: "indigo", label: "Indigo", swatch: "bg-indigo-500", bg: "bg-indigo-100 dark:bg-indigo-950/50", fg: "text-indigo-600 dark:text-indigo-400" },
  { key: "violet", label: "Violet", swatch: "bg-violet-500", bg: "bg-violet-100 dark:bg-violet-950/50", fg: "text-violet-600 dark:text-violet-400" },
  { key: "purple", label: "Purple", swatch: "bg-purple-500", bg: "bg-purple-100 dark:bg-purple-950/50", fg: "text-purple-600 dark:text-purple-400" },
  { key: "fuchsia", label: "Fuchsia", swatch: "bg-fuchsia-500", bg: "bg-fuchsia-100 dark:bg-fuchsia-950/50", fg: "text-fuchsia-600 dark:text-fuchsia-400" },
  { key: "pink", label: "Pink", swatch: "bg-pink-500", bg: "bg-pink-100 dark:bg-pink-950/50", fg: "text-pink-600 dark:text-pink-400" },
  { key: "rose", label: "Rose", swatch: "bg-rose-500", bg: "bg-rose-100 dark:bg-rose-950/50", fg: "text-rose-600 dark:text-rose-400" },
];

const ICON_COLOR_MAP = new Map(ICON_COLORS.map((c) => [c.key, c]));

export function getIconColor(key: string | null | undefined): IconColor | null {
  if (!key) return null;
  return ICON_COLOR_MAP.get(key) ?? null;
}
