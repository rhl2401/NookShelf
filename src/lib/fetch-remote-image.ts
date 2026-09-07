import "server-only";
import dns from "node:dns/promises";
import net from "node:net";

// Fetches a user-supplied image URL server-side. Since the URL is arbitrary
// (any signed-in user with asset:manage can supply one), this guards against
// SSRF: only http(s), no redirects (a validated public URL could otherwise
// redirect to an internal one), hostnames resolved and checked ourselves
// (string-only host checks are bypassable via DNS rebinding), and a hard cap
// on bytes actually read (Content-Length can't be trusted alone).

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;

const PRIVATE_IPV4_RANGES: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
];

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  return PRIVATE_IPV4_RANGES.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipInt & mask) === (ipv4ToInt(base) & mask);
  });
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === "::" ||
    lower === "::1" ||
    lower.startsWith("fe80:") ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("::ffff:127.")
  );
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) return isPrivateIPv6(ip);
  return true;
}

export async function fetchRemoteImage(rawUrl: string): Promise<Buffer> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http:// and https:// URLs are supported.");
  }

  const addresses = net.isIP(parsed.hostname)
    ? [parsed.hostname]
    : (await dns.lookup(parsed.hostname, { all: true })).map((r) => r.address);
  if (addresses.length === 0 || addresses.some(isPrivateIp)) {
    throw new Error("That URL points to a location we can't fetch from.");
  }

  const res = await fetch(parsed.toString(), {
    redirect: "manual",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (res.status >= 300 && res.status < 400) {
    throw new Error("That URL redirects — paste the direct image link instead.");
  }
  if (!res.ok) throw new Error(`Couldn't download that image (HTTP ${res.status}).`);

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error("That URL doesn't point to an image.");
  }

  const contentLength = res.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large (max 20MB).");
  }

  if (!res.body) throw new Error("Couldn't download that image.");
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error("Image is too large (max 20MB).");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export function guessNameFromUrl(rawUrl: string): string | null {
  try {
    const { pathname } = new URL(rawUrl);
    const last = pathname.split("/").filter(Boolean).pop();
    if (!last) return null;
    return decodeURIComponent(last.replace(/\.[^./]+$/, "")).trim().slice(0, 80) || null;
  } catch {
    return null;
  }
}
