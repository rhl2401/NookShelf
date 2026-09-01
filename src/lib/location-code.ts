/** Suggests a default location code — unlike Asset.assetTag, this is just a starting
 * point the user is free to overwrite with their own labeling scheme. */
export function generateLocationCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LOC-${ts}${rand}`;
}
