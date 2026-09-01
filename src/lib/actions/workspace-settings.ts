"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { PICTURE_SIZE_OPTIONS, DEFAULT_PICTURE_SIZE } from "@/lib/picture-size";
import { processLogoUpload } from "@/lib/image-processing";
import { saveLogoFile, deleteStoredFile } from "@/lib/storage";
import { isValidHexColor } from "@/lib/color-shared";

const SETTINGS_ID = "singleton";
const MAX_LOGO_UPLOAD_BYTES = 5 * 1024 * 1024;

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

/**
 * Raw branding fields (nullable — no fallback applied). Public read: this
 * powers the topbar and /login page, which render for signed-out visitors.
 * Callers apply their own fallback (see src/lib/branding-shared.ts) so an
 * unset field reads as "not customized" rather than baking the default in.
 */
export async function getWorkspaceBranding() {
  const settings = await prisma.workspaceSettings.findUnique({ where: { id: SETTINGS_ID } });
  return {
    appName: settings?.appName ?? null,
    hasLogo: Boolean(settings?.logoPath),
    icon: settings?.icon ?? null,
    iconColor: settings?.iconColor ?? null,
    color: settings?.color ?? null,
    signInHeadline: settings?.signInHeadline ?? null,
    signInSubtitle: settings?.signInSubtitle ?? null,
    updatedAt: settings?.updatedAt ?? null,
  };
}

function revalidateBranding() {
  // Busts the root layout (page title) and everything under it, including
  // /login and the (app) topbar, in one call.
  revalidatePath("/", "layout");
  revalidatePath("/settings");
}

export async function setWorkspaceBranding(input: {
  appName: string | null;
  color: string | null;
  signInHeadline: string | null;
  signInSubtitle: string | null;
}) {
  await requirePermission("settings:manage");
  if (input.color !== null && !isValidHexColor(input.color)) {
    throw new Error("Color must be a hex value like #3b82f6.");
  }

  await prisma.workspaceSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {
      appName: input.appName,
      color: input.color,
      signInHeadline: input.signInHeadline,
      signInSubtitle: input.signInSubtitle,
    },
    create: {
      id: SETTINGS_ID,
      appName: input.appName,
      color: input.color,
      signInHeadline: input.signInHeadline,
      signInSubtitle: input.signInSubtitle,
    },
  });

  revalidateBranding();
}

/** Sets the branding icon (an alternative to uploading a logo — see getWorkspaceBranding's precedence). */
export async function setWorkspaceIcon(data: { icon?: string | null; iconColor?: string | null }) {
  await requirePermission("settings:manage");

  await prisma.workspaceSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {
      ...(data.icon !== undefined ? { icon: data.icon } : {}),
      ...(data.iconColor !== undefined ? { iconColor: data.iconColor } : {}),
    },
    create: {
      id: SETTINGS_ID,
      icon: data.icon ?? null,
      iconColor: data.iconColor ?? null,
    },
  });

  revalidateBranding();
}

export async function uploadLogo(formData: FormData) {
  await requirePermission("settings:manage");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file provided.");
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_LOGO_UPLOAD_BYTES) throw new Error("File is too large (max 5MB).");

  const before = await prisma.workspaceSettings.findUnique({ where: { id: SETTINGS_ID } });
  const input = Buffer.from(await file.arrayBuffer());
  const { buffer } = await processLogoUpload(input);
  const relativePath = await saveLogoFile(buffer);

  await prisma.workspaceSettings.upsert({
    where: { id: SETTINGS_ID },
    update: { logoPath: relativePath, logoSizeBytes: buffer.byteLength },
    create: { id: SETTINGS_ID, logoPath: relativePath, logoSizeBytes: buffer.byteLength },
  });
  if (before?.logoPath) await deleteStoredFile(before.logoPath);

  revalidateBranding();
}

export async function removeLogo() {
  await requirePermission("settings:manage");
  const settings = await prisma.workspaceSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!settings?.logoPath) return;

  await prisma.workspaceSettings.update({
    where: { id: SETTINGS_ID },
    data: { logoPath: null, logoSizeBytes: null },
  });
  await deleteStoredFile(settings.logoPath);

  revalidateBranding();
}
