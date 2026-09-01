import "server-only";
import sharp from "sharp";

export const PICTURE_SIZE = 640;
const WEBP_QUALITY = 82;

/** Center-crops to a square, downscales, and re-encodes as webp. */
export async function processPictureUpload(
  input: Buffer,
  size: number = PICTURE_SIZE,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const buffer = await sharp(input)
    .rotate() // apply EXIF orientation before cropping
    .resize(size, size, { fit: "cover", position: "attention" })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return { buffer, width: size, height: size };
}
