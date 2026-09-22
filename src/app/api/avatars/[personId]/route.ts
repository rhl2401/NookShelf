import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ personId: string }> },
) {
  const session = await auth();
  if (!session?.user.permissions.includes("asset:view")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { personId } = await params;
  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person?.avatarPath) return new Response("Not found", { status: 404 });

  // avatarPath changes to a fresh random filename on every re-upload (see
  // saveAvatarFile), so it doubles as a perfect ETag — the id/URL a person's
  // avatar is served at otherwise never changes, so `no-cache` (always
  // revalidate) plus this ETag is what actually makes a new upload show up
  // reliably instead of a browser serving a stale cached copy. Same fix as
  // /api/pictures/[id].
  const etag = `"${person.avatarPath}"`;
  const cacheControl = "private, no-cache";
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": cacheControl } });
  }

  const buffer = await readStoredFile(person.avatarPath);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": cacheControl,
      ETag: etag,
    },
  });
}
