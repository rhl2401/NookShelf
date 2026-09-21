"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { processPictureUpload } from "@/lib/image-processing";
import { savePictureFile, deleteStoredFile, readStoredFile } from "@/lib/storage";
import { getWorkspacePictureSize } from "@/lib/actions/workspace-settings";
import { fetchRemoteImage, guessNameFromUrl } from "@/lib/fetch-remote-image";
import { removeBackgroundWithFallback } from "@/lib/background-removal";
import { loadBgRemovalSettings } from "@/lib/background-removal-settings";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const PREVIEW_MAX_DIMENSION = 480;

async function renderPreviewDataUrl(input: Buffer): Promise<string> {
  const preview = await sharp(input)
    .rotate() // apply EXIF orientation, matching what removeBackgroundLocal does internally
    .resize(PREVIEW_MAX_DIMENSION, PREVIEW_MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  return `data:image/png;base64,${preview.toString("base64")}`;
}

/**
 * Runs background removal on a not-yet-uploaded image and returns small
 * previews of both the original and the background-removed result as data
 * URLs — nothing is persisted. The original is also returned as a data URL
 * (not just the source URL) because the app's CSP only allows img-src
 * 'self'/blob:/data: — a pasted external image URL can't be hotlinked
 * directly into an <img>, so the browser needs bytes it's already allowed
 * to render.
 */
export async function previewBackgroundRemoval(
  formData: FormData,
): Promise<{ originalDataUrl: string; removedDataUrl: string; warning?: string }> {
  await requirePermission("asset:manage");

  const file = formData.get("file");
  const url = formData.get("url");
  let input: Buffer;
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("File is too large (max 20MB).");
    input = Buffer.from(await file.arrayBuffer());
  } else if (typeof url === "string" && url.trim()) {
    input = await fetchRemoteImage(url.trim());
  } else {
    throw new Error("No image provided.");
  }

  const settings = await loadBgRemovalSettings();
  const [originalDataUrl, { buffer, warning }] = await Promise.all([
    renderPreviewDataUrl(input),
    removeBackgroundWithFallback(input, settings),
  ]);
  const removedDataUrl = await renderPreviewDataUrl(buffer);

  return { originalDataUrl, removedDataUrl, warning };
}

export async function uploadPicture(
  formData: FormData,
  scope: "PERSONAL" | "WORKSPACE" = "PERSONAL",
  removeBg = false,
) {
  const session = await requirePermission("asset:manage");
  if (scope === "WORKSPACE") await requirePermission("picture:share");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file provided.");
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("File is too large (max 20MB).");

  const size = await getWorkspacePictureSize();
  let input: Buffer = Buffer.from(await file.arrayBuffer());
  if (removeBg) {
    const settings = await loadBgRemovalSettings();
    ({ buffer: input } = await removeBackgroundWithFallback(input, settings));
  }
  const { main, thumb } = await processPictureUpload(input, size);
  const [relativePath, thumbRelativePath] = await Promise.all([
    savePictureFile(main.buffer),
    savePictureFile(thumb.buffer),
  ]);
  const defaultName = file.name.replace(/\.[^./]+$/, "").trim().slice(0, 80) || null;

  const picture = await prisma.picture.create({
    data: {
      name: defaultName,
      scope,
      ownerId: session.user.personId,
      path: relativePath,
      sizeBytes: main.buffer.byteLength,
      width: main.width,
      height: main.height,
      thumbPath: thumbRelativePath,
      thumbSizeBytes: thumb.buffer.byteLength,
    },
  });

  revalidatePath("/pictures");
  return picture;
}

export async function uploadPictureFromUrl(
  url: string,
  scope: "PERSONAL" | "WORKSPACE" = "PERSONAL",
  removeBg = false,
) {
  const session = await requirePermission("asset:manage");
  if (scope === "WORKSPACE") await requirePermission("picture:share");

  let input = await fetchRemoteImage(url);
  if (removeBg) {
    const settings = await loadBgRemovalSettings();
    ({ buffer: input } = await removeBackgroundWithFallback(input, settings));
  }

  const size = await getWorkspacePictureSize();
  const { main, thumb } = await processPictureUpload(input, size);
  const [relativePath, thumbRelativePath] = await Promise.all([
    savePictureFile(main.buffer),
    savePictureFile(thumb.buffer),
  ]);

  const picture = await prisma.picture.create({
    data: {
      name: guessNameFromUrl(url),
      scope,
      ownerId: session.user.personId,
      path: relativePath,
      sizeBytes: main.buffer.byteLength,
      width: main.width,
      height: main.height,
      thumbPath: thumbRelativePath,
      thumbSizeBytes: thumb.buffer.byteLength,
    },
  });

  revalidatePath("/pictures");
  return picture;
}

export async function applyExistingPicture(assetId: string, pictureId: string) {
  const session = await requirePermission("asset:manage");
  const picture = await prisma.picture.findUniqueOrThrow({ where: { id: pictureId } });
  if (picture.scope !== "WORKSPACE" && picture.ownerId !== session.user.personId) {
    throw new Error("You don't have access to that picture.");
  }

  await prisma.asset.update({ where: { id: assetId }, data: { primaryPictureId: pictureId } });
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
}

export async function removePictureFromAsset(assetId: string) {
  await requirePermission("asset:manage");
  await prisma.asset.update({ where: { id: assetId }, data: { primaryPictureId: null } });
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
}

export async function deletePicture(pictureId: string) {
  const session = await requirePermission("asset:manage");
  const picture = await prisma.picture.findUniqueOrThrow({ where: { id: pictureId } });

  if (picture.scope === "WORKSPACE") {
    await requirePermission("picture:share");
  } else if (picture.ownerId !== session.user.personId) {
    throw new Error("You can only delete your own pictures.");
  }

  await prisma.picture.delete({ where: { id: pictureId } });
  await deleteStoredFile(picture.path);
  if (picture.thumbPath) await deleteStoredFile(picture.thumbPath);

  revalidatePath("/pictures");
  revalidatePath("/assets");
}

export async function shareToWorkspace(pictureId: string) {
  const session = await requirePermission("picture:share");
  const picture = await prisma.picture.findUniqueOrThrow({ where: { id: pictureId } });
  if (picture.ownerId !== session.user.personId) {
    throw new Error("You can only share your own pictures.");
  }

  await prisma.picture.update({ where: { id: pictureId }, data: { scope: "WORKSPACE" } });
  revalidatePath("/pictures");
}

export async function unshareFromWorkspace(pictureId: string) {
  await requirePermission("picture:share");
  const picture = await prisma.picture.findUniqueOrThrow({
    where: { id: pictureId },
    include: { assets: { select: { assignedToId: true } } },
  });
  if (picture.scope !== "WORKSPACE") throw new Error("This picture isn't shared.");

  // Allowed even with assets still using the picture, as long as every one
  // of them is assigned to the picture's own owner — pulling it back to
  // personal wouldn't take it away from anyone else's asset.
  const usedByOthers = picture.assets.some((a) => a.assignedToId !== picture.ownerId);
  if (usedByOthers) {
    throw new Error(
      "This picture is used on an asset assigned to someone other than its owner — remove it there first.",
    );
  }

  await prisma.picture.update({ where: { id: pictureId }, data: { scope: "PERSONAL" } });
  revalidatePath("/pictures");
}

export async function renamePicture(pictureId: string, name: string) {
  const session = await requirePermission("asset:manage");
  const picture = await prisma.picture.findUniqueOrThrow({ where: { id: pictureId } });

  if (picture.scope === "WORKSPACE") {
    await requirePermission("picture:share");
  } else if (picture.ownerId !== session.user.personId) {
    throw new Error("You can only rename your own pictures.");
  }

  const trimmed = name.trim().slice(0, 80);
  await prisma.picture.update({ where: { id: pictureId }, data: { name: trimmed || null } });
  revalidatePath("/pictures");
}

async function requirePictureEditAccess(pictureId: string) {
  const session = await requirePermission("asset:manage");
  const picture = await prisma.picture.findUniqueOrThrow({ where: { id: pictureId } });
  if (picture.scope === "WORKSPACE") {
    await requirePermission("picture:share");
  } else if (picture.ownerId !== session.user.personId) {
    throw new Error("You can only edit your own pictures.");
  }
  return picture;
}

/**
 * Runs background removal on an already-stored library picture and returns a
 * small preview as a data URL — nothing is changed yet. Mirrors
 * previewBackgroundRemoval, but reads the existing file instead of a fresh
 * upload.
 */
export async function previewBackgroundRemovalForPicture(
  pictureId: string,
): Promise<{ removedDataUrl: string; warning?: string }> {
  const picture = await requirePictureEditAccess(pictureId);
  const input = await readStoredFile(picture.path);

  const settings = await loadBgRemovalSettings();
  const { buffer, warning } = await removeBackgroundWithFallback(input, settings);
  const removedDataUrl = await renderPreviewDataUrl(buffer);

  return { removedDataUrl, warning };
}

/**
 * Removes the background of an already-stored library picture and swaps it
 * in as a NEW Picture row, repointing every asset/asset type/kit/location/
 * consumable that referenced the old one — rather than overwriting the old
 * row's file in place. A new id means a new /api/pictures/[id] URL, which is
 * what actually makes the change show up everywhere reliably: reusing the
 * same id/URL left browsers (and any proxy/CDN in front of them) free to go
 * on serving whatever they'd already cached at that URL, and a same-string
 * <img src> across a client-side re-render doesn't even trigger a new
 * request for the browser to reconsider. The old picture is deleted once
 * nothing points to it any more — irreversible.
 */
export async function applyBackgroundRemoval(pictureId: string) {
  const picture = await requirePictureEditAccess(pictureId);
  const input = await readStoredFile(picture.path);

  const settings = await loadBgRemovalSettings();
  const { buffer } = await removeBackgroundWithFallback(input, settings);

  const size = await getWorkspacePictureSize();
  const { main, thumb } = await processPictureUpload(buffer, size);
  const [relativePath, thumbRelativePath] = await Promise.all([
    savePictureFile(main.buffer),
    savePictureFile(thumb.buffer),
  ]);

  await prisma.$transaction(async (tx) => {
    const next = await tx.picture.create({
      data: {
        name: picture.name,
        scope: picture.scope,
        ownerId: picture.ownerId,
        path: relativePath,
        sizeBytes: main.buffer.byteLength,
        width: main.width,
        height: main.height,
        thumbPath: thumbRelativePath,
        thumbSizeBytes: thumb.buffer.byteLength,
      },
    });

    const where = { primaryPictureId: pictureId };
    const data = { primaryPictureId: next.id };
    await Promise.all([
      tx.asset.updateMany({ where, data }),
      tx.assetType.updateMany({ where, data }),
      tx.kit.updateMany({ where, data }),
      tx.location.updateMany({ where, data }),
      tx.consumable.updateMany({ where, data }),
    ]);

    // Safe now that nothing references it any more.
    await tx.picture.delete({ where: { id: pictureId } });
  });

  await deleteStoredFile(picture.path);
  if (picture.thumbPath) await deleteStoredFile(picture.thumbPath);

  revalidatePath("/pictures");
  revalidatePath("/assets");
  revalidatePath("/asset-types");
  revalidatePath("/kits");
  revalidatePath("/locations");
  revalidatePath("/consumables");
}

const SEARCH_RESULT_LIMIT = 24;

export async function searchPictures(query: string) {
  const session = await requirePermission("asset:manage");
  const q = query.trim();
  if (!q) return { mine: [], workspace: [] };

  const [mine, workspace] = await Promise.all([
    session.user.personId
      ? prisma.picture.findMany({
          where: { scope: "PERSONAL", ownerId: session.user.personId, name: { contains: q, mode: "insensitive" } },
          orderBy: { createdAt: "desc" },
          take: SEARCH_RESULT_LIMIT,
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    prisma.picture.findMany({
      where: { scope: "WORKSPACE", name: { contains: q, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: SEARCH_RESULT_LIMIT,
      select: { id: true, name: true },
    }),
  ]);

  return { mine, workspace };
}

export async function flushUnusedPictures() {
  const session = await requirePermission("asset:manage");
  const unused = await prisma.picture.findMany({
    where: {
      scope: "PERSONAL",
      ownerId: session.user.personId,
      assets: { none: {} },
    },
  });

  await prisma.picture.deleteMany({ where: { id: { in: unused.map((p) => p.id) } } });
  await Promise.all(
    unused.flatMap((p) => [
      deleteStoredFile(p.path),
      ...(p.thumbPath ? [deleteStoredFile(p.thumbPath)] : []),
    ]),
  );

  revalidatePath("/pictures");
  return unused.length;
}
