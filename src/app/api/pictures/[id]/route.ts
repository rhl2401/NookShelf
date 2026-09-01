import { readFile } from "node:fs/promises";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveStoredFilePath } from "@/lib/storage";

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

  const buffer = await readFile(resolveStoredFilePath(relativePath));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
