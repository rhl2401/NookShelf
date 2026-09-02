import "server-only";
import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { isS3Enabled, s3PutObject, s3DeleteObject, s3GetObject } from "@/lib/storage-s3";

const UPLOADS_DIR = process.env.UPLOADS_DIR || "./uploads";

export function uploadsRoot() {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), UPLOADS_DIR);
}

/** Rejects a path segment that isn't a plain name (no traversal, no nesting). */
function assertSafeSegment(segment: string, label: string) {
  if (!segment || segment.includes("/") || segment.includes("\\") || segment.includes("..")) {
    throw new Error(`Invalid ${label}.`);
  }
}

async function writeStoredFile(relativePath: string, buffer: Buffer, contentType?: string) {
  if (isS3Enabled()) {
    await s3PutObject(relativePath, buffer, contentType);
    return;
  }
  const dest = resolveStoredFilePath(relativePath);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buffer);
}

/** Saves a File under uploads/assets/<assetId>/, returning the relative path stored on Attachment.path. */
export async function saveAssetAttachment(assetId: string, file: File) {
  assertSafeSegment(assetId, "asset id");

  const ext = path.extname(file.name) || "";
  const filename = `${crypto.randomUUID()}${ext}`;
  const relativePath = `assets/${assetId}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeStoredFile(relativePath, buffer, file.type || undefined);

  return relativePath;
}

/** Saves a processed picture buffer under uploads/pictures/, returning the relative path stored on Picture.path. */
export async function savePictureFile(buffer: Buffer) {
  const relativePath = `pictures/${crypto.randomUUID()}.webp`;
  await writeStoredFile(relativePath, buffer, "image/webp");
  return relativePath;
}

/** Saves a processed avatar buffer under uploads/avatars/, returning the relative path stored on Person.avatarPath. */
export async function saveAvatarFile(buffer: Buffer) {
  const relativePath = `avatars/${crypto.randomUUID()}.webp`;
  await writeStoredFile(relativePath, buffer, "image/webp");
  return relativePath;
}

/** Saves a processed logo buffer under uploads/branding/, returning the relative path stored on WorkspaceSettings.logoPath. */
export async function saveLogoFile(buffer: Buffer) {
  const relativePath = `branding/${crypto.randomUUID()}.webp`;
  await writeStoredFile(relativePath, buffer, "image/webp");
  return relativePath;
}

export async function deleteStoredFile(relativePath: string) {
  try {
    if (isS3Enabled()) {
      await s3DeleteObject(relativePath);
      return;
    }
    await unlink(resolveStoredFilePath(relativePath));
  } catch {
    // already gone (or an invalid path) — fine.
  }
}

/** Reads a stored file's bytes back, from local disk or S3 depending on STORAGE_DRIVER. */
export async function readStoredFile(relativePath: string): Promise<Buffer> {
  if (isS3Enabled()) {
    return s3GetObject(relativePath);
  }
  return readFile(resolveStoredFilePath(relativePath));
}

/** Local-disk-only: resolves a relative path to an absolute one, rejecting traversal outside uploadsRoot(). */
export function resolveStoredFilePath(relativePath: string) {
  const resolved = path.resolve(/* turbopackIgnore: true */ uploadsRoot(), relativePath);
  if (resolved !== uploadsRoot() && !resolved.startsWith(uploadsRoot() + path.sep)) {
    throw new Error("Invalid file path.");
  }
  return resolved;
}
