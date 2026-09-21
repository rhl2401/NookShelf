import "server-only";
import sharp from "sharp";
import { type BgRemovalProvider } from "@/lib/background-removal-shared";

export type BgRemovalSettings = { provider: BgRemovalProvider; apiKey: string | null };

// Working resolution for the local flood-fill — no picture library size option
// goes above 1080px, so removing background at higher resolution than that
// only costs time without adding any visible detail to the final stored image.
const WORKING_MAX_DIMENSION = 1600;

// A pixel within this distance of pure white (per-channel) counts as fully
// background. Between this and +FEATHER_BAND, alpha ramps linearly instead of
// snapping, so the cutout edge doesn't look hard/aliased.
const NEAR_WHITE_THRESHOLD = 24;
const FEATHER_BAND = 18;

// A near-white region fully enclosed by the subject (never touching the
// image border — e.g. the visible gap between a headphone's earcups and its
// headband) gets cleared too, but only once it's at least this fraction of
// the image's pixels. There's no way to tell that apart from a legitimate
// small white design detail (a logo, a specular highlight) by color alone —
// size is the only signal available, so this stays a deliberately
// conservative floor to avoid punching holes in those.
const ENCLOSED_HOLE_MIN_FRACTION = 0.002;
const ENCLOSED_HOLE_MIN_PIXELS = 24;

/**
 * Removes a white/near-white background in-process. Flood-fills inward from
 * every border pixel that's close enough to white — so background merely
 * connected to the edge is cleared without touching a white region inside
 * the subject itself (e.g. a white shoe on a white backdrop) — then a second
 * pass clears any remaining near-white region large enough to plausibly be
 * background peeking through an enclosed gap in the subject rather than a
 * small design detail. No ML, no network call; only works well on solid,
 * evenly-lit light backgrounds.
 */
export async function removeBackgroundLocal(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .rotate() // apply EXIF orientation before we start reasoning about pixel coordinates
    .resize(WORKING_MAX_DIMENSION, WORKING_MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const stack: number[] = [];

  function distFromWhite(pixelIndex: number): number {
    const o = pixelIndex * channels;
    return Math.max(255 - data[o], 255 - data[o + 1], 255 - data[o + 2]);
  }

  function alphaFor(dist: number): number {
    if (dist <= NEAR_WHITE_THRESHOLD) return 0;
    if (dist >= NEAR_WHITE_THRESHOLD + FEATHER_BAND) return 255;
    return Math.round((255 * (dist - NEAR_WHITE_THRESHOLD)) / FEATHER_BAND);
  }

  function seed(x: number, y: number) {
    const i = y * width + x;
    if (visited[i]) return;
    const dist = distFromWhite(i);
    if (dist > NEAR_WHITE_THRESHOLD + FEATHER_BAND) return;
    visited[i] = 1;
    data[i * channels + 3] = alphaFor(dist);
    stack.push(i);
  }

  for (let x = 0; x < width; x++) {
    seed(x, 0);
    seed(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    seed(0, y);
    seed(width - 1, y);
  }

  while (stack.length > 0) {
    const i = stack.pop()!;
    const x = i % width;
    const y = (i - x) / width;

    if (x > 0) seed(x - 1, y);
    if (x < width - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < height - 1) seed(x, y + 1);
  }

  // Second pass: any near-white pixel `visited` didn't already claim above is
  // fully enclosed by non-background-colored pixels (if it were reachable
  // from the border by any near-white path, however thin, the flood fill
  // above would already have found it). Group those into connected
  // components and clear the ones large enough to plausibly be a real gap.
  const enclosedHoleMinPixels = Math.max(
    ENCLOSED_HOLE_MIN_PIXELS,
    Math.round(pixelCount * ENCLOSED_HOLE_MIN_FRACTION),
  );
  const component: number[] = [];
  for (let start = 0; start < pixelCount; start++) {
    if (visited[start]) continue;
    if (distFromWhite(start) > NEAR_WHITE_THRESHOLD + FEATHER_BAND) continue;

    component.length = 0;
    component.push(start);
    visited[start] = 1;
    let head = 0;
    while (head < component.length) {
      const i = component[head++];
      const x = i % width;
      const y = (i - x) / width;
      const neighbors = [
        x > 0 ? i - 1 : -1,
        x < width - 1 ? i + 1 : -1,
        y > 0 ? i - width : -1,
        y < height - 1 ? i + width : -1,
      ];
      for (const n of neighbors) {
        if (n < 0 || visited[n]) continue;
        if (distFromWhite(n) > NEAR_WHITE_THRESHOLD + FEATHER_BAND) continue;
        visited[n] = 1;
        component.push(n);
      }
    }

    if (component.length < enclosedHoleMinPixels) continue; // too small — likely a design detail, leave opaque
    for (const i of component) {
      data[i * channels + 3] = alphaFor(distFromWhite(i));
    }
  }

  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

async function removeBackgroundRemote(input: Buffer, provider: BgRemovalProvider, apiKey: string): Promise<Buffer> {
  if (provider === "removebg") return callRemoveBg(input, apiKey);
  throw new Error(`Unknown background-removal provider "${provider}".`);
}

async function callRemoveBg(input: Buffer, apiKey: string): Promise<Buffer> {
  const form = new FormData();
  form.append("image_file", new Blob([Uint8Array.from(input)]), "image");
  form.append("size", "auto");

  let res: Response;
  try {
    res = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: form,
    });
  } catch {
    throw new Error("Couldn't reach remove.bg.");
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { errors?: Array<{ title?: string }> };
      detail = body.errors?.[0]?.title ?? "";
    } catch {
      // response wasn't JSON — fall back to the status text below
    }
    throw new Error(`remove.bg error (${res.status}): ${detail || res.statusText}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

/**
 * Removes the background per the workspace's configured provider, falling
 * back to the local remover (and reporting why) if a configured remote
 * provider fails — a flaky/expired key shouldn't dead-end the upload.
 */
export async function removeBackgroundWithFallback(
  input: Buffer,
  settings: BgRemovalSettings,
): Promise<{ buffer: Buffer; provider: BgRemovalProvider; warning?: string }> {
  if (settings.provider !== "local" && settings.apiKey) {
    try {
      const buffer = await removeBackgroundRemote(input, settings.provider, settings.apiKey);
      return { buffer, provider: settings.provider };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Remote background removal failed";
      const buffer = await removeBackgroundLocal(input);
      return { buffer, provider: "local", warning: `${message} — used local removal instead.` };
    }
  }
  const buffer = await removeBackgroundLocal(input);
  return { buffer, provider: "local" };
}
