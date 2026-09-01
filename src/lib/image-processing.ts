import "server-only";
import sharp from "sharp";
import { THUMB_SIZE } from "@/lib/picture-size";

export const AVATAR_SIZE = 256;
const WEBP_QUALITY = 82;

async function cropToSquareWebp(input: Buffer, size: number): Promise<Buffer> {
  return sharp(input)
    .rotate() // apply EXIF orientation before cropping
    .resize(size, size, { fit: "cover", position: "attention" })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

/** Center-crops to a single square size, downscales, and re-encodes as webp — used for avatars. */
export async function processImageUpload(
  input: Buffer,
  size: number,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const buffer = await cropToSquareWebp(input, size);
  return { buffer, width: size, height: size };
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
  const [mainBuffer, thumbBuffer] = await Promise.all([
    cropToSquareWebp(input, size),
    cropToSquareWebp(input, THUMB_SIZE),
  ]);

  return {
    main: { buffer: mainBuffer, width: size, height: size },
    thumb: { buffer: thumbBuffer, width: THUMB_SIZE, height: THUMB_SIZE },
  };
}
