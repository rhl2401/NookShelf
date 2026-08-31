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
