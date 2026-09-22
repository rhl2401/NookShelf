import "server-only";
import { prisma } from "@/lib/prisma";
import { fetchRemoteImage } from "@/lib/fetch-remote-image";
import { processImageUpload, AVATAR_SIZE } from "@/lib/image-processing";
import { saveAvatarFile } from "@/lib/storage";

/**
 * Downloads an OAuth provider's profile picture and sets it as the person's
 * avatar — but only if they don't already have one, so this never overwrites
 * a manually uploaded/cropped avatar, and only runs once per person until
 * they remove their avatar. Called on every sign-in (see src/auth.ts), which
 * also means a person who signed in before ever setting a picture on their
 * identity provider picks it up automatically on a later sign-in, instead of
 * only ever being attempted once at account creation.
 *
 * Best-effort: a failed download must never block sign-in, so errors are
 * logged and swallowed rather than thrown.
 */
export async function syncAvatarFromOAuthIfMissing(
  userId: string,
  imageUrl: string | null | undefined,
) {
  if (!imageUrl) return;

  const person = await prisma.person.findUnique({
    where: { userId },
    select: { id: true, avatarPath: true },
  });
  if (!person || person.avatarPath) return;

  try {
    const input = await fetchRemoteImage(imageUrl);
    const { buffer } = await processImageUpload(input, AVATAR_SIZE);
    const relativePath = await saveAvatarFile(buffer);

    await prisma.person.update({
      where: { id: person.id },
      data: { avatarPath: relativePath, avatarSizeBytes: buffer.byteLength },
    });
  } catch (err) {
    console.error(`[avatar-sync] Couldn't sync avatar for person ${person.id}:`, err);
  }
}
