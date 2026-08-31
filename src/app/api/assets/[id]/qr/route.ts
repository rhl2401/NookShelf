import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateQrPng } from "@/lib/qr";
import { assetScanPath } from "@/lib/scan-code";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user.permissions.includes("asset:view")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const asset = await prisma.asset.findUnique({ where: { id }, select: { assetTag: true } });
  if (!asset) return new Response("Not found", { status: 404 });

  const origin = new URL(req.url).origin;
  const png = await generateQrPng(`${origin}${assetScanPath(asset.assetTag)}`);

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
