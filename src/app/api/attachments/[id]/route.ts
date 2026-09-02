import { readFile } from "node:fs/promises";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveStoredFilePath } from "@/lib/storage";
import { INLINE_SAFE_ATTACHMENT_MIME_TYPES } from "@/lib/attachment-types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user.permissions.includes("asset:view")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) return new Response("Not found", { status: 404 });

  const buffer = await readFile(resolveStoredFilePath(attachment.path));
  const disposition = INLINE_SAFE_ATTACHMENT_MIME_TYPES.has(attachment.mimeType)
    ? "inline"
    : "attachment";
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(attachment.originalName)}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
