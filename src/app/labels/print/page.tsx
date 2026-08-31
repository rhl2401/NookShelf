import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AssetLabel } from "@/components/labels/asset-label";
import { PrintButton } from "@/components/labels/print-button";
import { redirect } from "next/navigation";

export default async function PrintLabelsPage({ searchParams }: PageProps<"/labels/print">) {
  const session = await auth();
  if (!session?.user.permissions.includes("asset:view")) redirect("/dashboard");

  const sp = await searchParams;
  const idsParam = typeof sp.ids === "string" ? sp.ids : "";
  const ids = idsParam.split(",").filter(Boolean);

  const assets = await prisma.asset.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, assetTag: true },
  });

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-background p-8">
      <div className="print:hidden">
        <PrintButton />
      </div>
      <div className="flex flex-wrap gap-4">
        {assets.map((asset) => (
          <AssetLabel
            key={asset.id}
            name={asset.name}
            assetTag={asset.assetTag}
            qrSrc={`/api/assets/${asset.id}/qr`}
          />
        ))}
      </div>
      {assets.length === 0 && (
        <p className="text-sm text-muted-foreground">No assets selected.</p>
      )}
    </div>
  );
}
