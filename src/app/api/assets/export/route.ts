import Papa from "papaparse";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeRow } from "@/lib/data-io/sanitize-cell";

export async function GET() {
  const session = await auth();
  if (!session?.user.permissions.includes("asset:view")) {
    return new Response("Forbidden", { status: 403 });
  }

  const assets = await prisma.asset.findMany({
    include: { assetType: true, location: true, assignedTo: true, tags: { include: { tag: true } } },
    orderBy: { createdAt: "asc" },
  });

  const rows = assets.map((a) =>
    sanitizeRow({
      assetTag: a.assetTag,
      name: a.name,
      assetType: a.assetType.name,
      location: a.location?.name ?? "",
      assignedTo: a.assignedTo?.name ?? "",
      status: a.status,
      tags: a.tags.map((t) => t.tag.name).join("|"),
      notes: a.notes ?? "",
      purchaseDate: a.purchaseDate ? a.purchaseDate.toISOString().slice(0, 10) : "",
      purchasePrice: a.purchasePrice?.toString() ?? "",
      purchaseCurrency: a.purchaseCurrency ?? "",
      vendor: a.vendor ?? "",
      warrantyExpiresAt: a.warrantyExpiresAt ? a.warrantyExpiresAt.toISOString().slice(0, 10) : "",
      customFields: JSON.stringify(a.customFields ?? {}),
    }),
  );

  const csv = Papa.unparse(rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="assets-export.csv"`,
    },
  });
}
