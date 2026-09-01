import { readFile } from "node:fs/promises";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveStoredFilePath } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user.permissions.includes("asset:view")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const picture = await prisma.picture.findUnique({ where: { id } });
  if (!picture) return new Response("Not found", { status: 404 });

  const buffer = await readFile(resolveStoredFilePath(picture.path));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
