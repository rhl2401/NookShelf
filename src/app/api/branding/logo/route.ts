import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

// Deliberately public — the logo renders on /login before anyone is signed in.
export async function GET() {
  const settings = await prisma.workspaceSettings.findUnique({ where: { id: "singleton" } });
  if (!settings?.logoPath) return new Response("Not found", { status: 404 });

  const buffer = await readStoredFile(settings.logoPath);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
