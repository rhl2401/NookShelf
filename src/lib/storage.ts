import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const UPLOADS_DIR = process.env.UPLOADS_DIR || "./uploads";

export function uploadsRoot() {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), UPLOADS_DIR);
}

/** Saves a File under uploads/assets/<assetId>/, returning the relative path stored on Attachment.path. */
export async function saveAssetAttachment(assetId: string, file: File) {
  const dir = path.join(uploadsRoot(), "assets", assetId);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name) || "";
  const filename = `${crypto.randomUUID()}${ext}`;
  const relativePath = path.join("assets", assetId, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsRoot(), relativePath), buffer);

  return relativePath;
}

/** Saves a processed picture buffer under uploads/pictures/, returning the relative path stored on Picture.path. */
export async function savePictureFile(buffer: Buffer) {
  const dir = path.join(uploadsRoot(), "pictures");
  await mkdir(dir, { recursive: true });

  const filename = `${crypto.randomUUID()}.webp`;
  const relativePath = path.join("pictures", filename);
  await writeFile(path.join(uploadsRoot(), relativePath), buffer);

  return relativePath;
}

/** Saves a processed avatar buffer under uploads/avatars/, returning the relative path stored on Person.avatarPath. */
export async function saveAvatarFile(buffer: Buffer) {
  const dir = path.join(uploadsRoot(), "avatars");
  await mkdir(dir, { recursive: true });

  const filename = `${crypto.randomUUID()}.webp`;
  const relativePath = path.join("avatars", filename);
  await writeFile(path.join(uploadsRoot(), relativePath), buffer);

  return relativePath;
}

export async function deleteStoredFile(relativePath: string) {
  try {
    await unlink(path.join(/* turbopackIgnore: true */ uploadsRoot(), relativePath));
  } catch {
    // already gone — fine.
  }
}

export function resolveStoredFilePath(relativePath: string) {
  const resolved = path.resolve(/* turbopackIgnore: true */ uploadsRoot(), relativePath);
  if (!resolved.startsWith(uploadsRoot())) {
    throw new Error("Invalid file path.");
  }
  return resolved;
}
