"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { processPictureUpload } from "@/lib/image-processing";
import { savePictureFile, deleteStoredFile } from "@/lib/storage";
import { getWorkspacePictureSize } from "@/lib/actions/workspace-settings";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export async function uploadPicture(formData: FormData, scope: "PERSONAL" | "WORKSPACE" = "PERSONAL") {
  const session = await requirePermission("asset:manage");
  if (scope === "WORKSPACE") await requirePermission("picture:share");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file provided.");
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("File is too large (max 20MB).");

  const size = await getWorkspacePictureSize();
  const input = Buffer.from(await file.arrayBuffer());
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
    include: { _count: { select: { assets: true } } },
  });
  if (picture.scope !== "WORKSPACE") throw new Error("This picture isn't shared.");
  if (picture._count.assets > 0) {
    throw new Error("This picture is still in use on an asset — remove it from there first.");
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
