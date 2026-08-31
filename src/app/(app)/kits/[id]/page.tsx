import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function KitDetailPage({ params }: PageProps<"/kits/[id]">) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user.permissions.includes("kit:view")) notFound();

  const kit = await prisma.kit.findUnique({
    where: { id },
    include: {
      members: { include: { asset: true } },
      checkouts: {
        include: { borrower: true },
        orderBy: { checkedOutAt: "desc" },
        take: 20,
      },
    },
  });
  if (!kit) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/kits" className="text-sm text-muted-foreground hover:underline">
          ← Kits
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{kit.name}</h1>
        {kit.description && <p className="text-sm text-muted-foreground">{kit.description}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assets ({kit.members.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {kit.members.map((m) => (
            <Link
              key={m.assetId}
              href={`/assets/${m.assetId}`}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/50"
            >
              <span className="font-medium">{m.asset.name}</span>
              <span className="flex items-center gap-2 text-muted-foreground">
                <Badge variant="outline">{m.asset.status.replace("_", " ")}</Badge>
                {m.asset.assetTag}
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checkout history</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {kit.checkouts.map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b pb-2 last:border-0">
              <span>
                {c.borrower.name} — {c.checkedOutAt.toLocaleDateString()} to{" "}
                {c.returnedAt ? c.returnedAt.toLocaleDateString() : `due ${c.dueAt.toLocaleDateString()}`}
              </span>
              <Badge variant={c.status === "OUT" ? "secondary" : "outline"}>{c.status}</Badge>
            </div>
          ))}
          {kit.checkouts.length === 0 && (
            <p className="text-muted-foreground">Never checked out.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
