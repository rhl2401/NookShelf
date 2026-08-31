/** The path a scanned/printed QR code encodes for a given asset tag. */
export function assetScanPath(assetTag: string) {
  return `/a/${encodeURIComponent(assetTag)}`;
}

/** Extracts an asset tag from scanned text, whether it's a full URL or a bare code. */
export function parseScannedAssetTag(text: string): string {
  const trimmed = text.trim();
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "a" && parts[1]) return decodeURIComponent(parts[1]);
  } catch {
    // Not a URL — fall through and treat as a bare code.
  }
  return trimmed;
}
