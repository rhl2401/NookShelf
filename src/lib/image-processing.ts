import "server-only";
import sharp from "sharp";
import { THUMB_SIZE } from "@/lib/picture-size";
import { MAX_LOGO_DIMENSION } from "@/lib/branding-shared";

export const AVATAR_SIZE = 256;
const WEBP_QUALITY = 82;

async function padToSquareWebp(
  input: Buffer,
  size: number,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  // withoutEnlargement keeps a source smaller than `size` at its native
  // resolution instead of upscaling it — upscaling can't add detail that
  // wasn't there, it just bakes blur permanently into the stored webp.
  // fit: "contain" letterboxes non-square images onto a transparent square
  // instead of cropping their long edge away, so the full image survives.
  const { data, info } = await sharp(input)
    .rotate() // apply EXIF orientation before resizing
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height };
}

/** Pads to a single square size (keeping the full image), downscales, and re-encodes as webp — used for avatars. */
export async function processImageUpload(
  input: Buffer,
  size: number,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  return padToSquareWebp(input, size);
}

/**
 * Square-crops at `size` (the workspace's configured picture size) and also
 * generates a fixed 64×64 thumb, for the reusable picture library — every
 * upload there is saved in both sizes so small displays (lists, pickers)
 * never have to download the large version.
 */
export async function processPictureUpload(
  input: Buffer,
  size: number,
): Promise<{
  main: { buffer: Buffer; width: number; height: number };
  thumb: { buffer: Buffer; width: number; height: number };
}> {
  const [main, thumb] = await Promise.all([
    padToSquareWebp(input, size),
    padToSquareWebp(input, THUMB_SIZE),
  ]);

  return { main, thumb };
}

/**
 * Downscales to fit within a bounding box without cropping or forcing a square,
 * and re-encodes as webp (keeps transparency) — used for the workspace logo,
 * which is often a wide wordmark rather than an icon.
 */
export async function processLogoUpload(
  input: Buffer,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const resized = sharp(input)
    .rotate()
    .resize(MAX_LOGO_DIMENSION, MAX_LOGO_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY });
  const buffer = await resized.toBuffer();
  const { width, height } = await sharp(buffer).metadata();
  return { buffer, width: width ?? MAX_LOGO_DIMENSION, height: height ?? MAX_LOGO_DIMENSION };
}
