"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { PICTURE_SIZE_OPTIONS, DEFAULT_PICTURE_SIZE } from "@/lib/picture-size";

const SETTINGS_ID = "singleton";

export async function getWorkspacePictureSize(): Promise<number> {
  const settings = await prisma.workspaceSettings.findUnique({ where: { id: SETTINGS_ID } });
  return settings?.pictureSize ?? DEFAULT_PICTURE_SIZE;
}

export async function setWorkspacePictureSize(size: number) {
  await requirePermission("settings:manage");
  if (!PICTURE_SIZE_OPTIONS.includes(size as (typeof PICTURE_SIZE_OPTIONS)[number])) {
    throw new Error("Invalid picture size.");
  }

  await prisma.workspaceSettings.upsert({
    where: { id: SETTINGS_ID },
    update: { pictureSize: size },
    create: { id: SETTINGS_ID, pictureSize: size },
  });

  revalidatePath("/settings");
}
