import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AssetLabel } from "@/components/labels/asset-label";
import { PrintButton } from "@/components/labels/print-button";

export default async function AssetLabelPage({ params }: PageProps<"/labels/[assetId]">) {
  const session = await auth();
  if (!session?.user.permissions.includes("asset:view")) notFound();

  const { assetId } = await params;
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { name: true, assetTag: true },
  });
  if (!asset) notFound();

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-background p-8">
      <div className="print:hidden">
        <PrintButton />
      </div>
      <AssetLabel name={asset.name} assetTag={asset.assetTag} qrSrc={`/api/assets/${assetId}/qr`} />
    </div>
  );
}
