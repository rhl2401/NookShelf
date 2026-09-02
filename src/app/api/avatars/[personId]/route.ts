import { readFile } from "node:fs/promises";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveStoredFilePath } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ personId: string }> },
) {
  const session = await auth();
  if (!session?.user.permissions.includes("asset:view")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { personId } = await params;
  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person?.avatarPath) return new Response("Not found", { status: 404 });

  const buffer = await readFile(resolveStoredFilePath(person.avatarPath));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
