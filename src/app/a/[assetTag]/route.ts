import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ assetTag: string }> },
) {
  const session = await auth();
  if (!session?.user.permissions.includes("asset:view")) {
    return new Response("Forbidden", { status: 403 });
  }

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
