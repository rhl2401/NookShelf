// Pure constants/types, safe to import from client components — kept separate
// from background-removal.ts and background-removal-settings.ts, which pull
// in `sharp`/prisma (server-only).

export const BG_REMOVAL_PROVIDERS = [
  { value: "local", label: "Local (built-in)" },
  { value: "removebg", label: "remove.bg" },
] as const;

export type BgRemovalProvider = (typeof BG_REMOVAL_PROVIDERS)[number]["value"];

export function isBgRemovalProvider(value: unknown): value is BgRemovalProvider {
  return BG_REMOVAL_PROVIDERS.some((p) => p.value === value);
}
