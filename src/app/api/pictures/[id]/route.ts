import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user.permissions.includes("asset:view")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const picture = await prisma.picture.findUnique({ where: { id } });
  if (!picture) return new Response("Not found", { status: 404 });

  const wantsThumb = new URL(req.url).searchParams.get("size") === "thumb";
  // Older pictures predate the thumb field — fall back to the full size for those.
  const relativePath = wantsThumb && picture.thumbPath ? picture.thumbPath : picture.path;

  // The picture's own id never changes even when its bytes do — in-place
  // edits like background removal deliberately keep the same id/URL so every
  // asset/asset type/kit referencing it picks up the change automatically.
  // relativePath does change on every edit (savePictureFile always writes a
  // fresh random filename), so it doubles as a perfect ETag: `no-cache`
  // forces a revalidation round-trip on every load, and that ETag lets it
  // come back as a cheap 304 whenever the picture hasn't actually changed,
  // rather than the browser silently serving a stale cached copy for a day.
  const etag = `"${relativePath}"`;
  const cacheControl = "private, no-cache";
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": cacheControl } });
  }

  const buffer = await readStoredFile(relativePath);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": cacheControl,
      ETag: etag,
    },
  });
}
