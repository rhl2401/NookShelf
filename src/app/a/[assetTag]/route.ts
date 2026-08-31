import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ assetTag: string }> },
) {
  const { assetTag } = await params;
  const asset = await prisma.asset.findUnique({
    where: { assetTag: decodeURIComponent(assetTag) },
    select: { id: true },
  });

  const origin = new URL(req.url).origin;
  if (!asset) {
    return NextResponse.redirect(new URL(`/assets?notfound=${assetTag}`, origin));
  }
  return NextResponse.redirect(new URL(`/assets/${asset.id}`, origin));
}
