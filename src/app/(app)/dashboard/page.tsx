import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { addDays } from "date-fns";

export default async function DashboardPage() {
  const session = await auth();
  const canViewConsumables = Boolean(session?.user.permissions.includes("consumable:view"));

  const now = new Date();
  const warrantyHorizon = addDays(now, 30);

  const [
    totalAssets,
    checkedOutCount,
    overdueCheckouts,
    warrantyExpiring,
    byLocation,
    consumablesWithThreshold,
  ] = await Promise.all([
    prisma.asset.count(),
    prisma.checkout.count({ where: { status: "OUT" } }),
    prisma.checkout.findMany({
      where: { status: "OUT", dueAt: { lt: now } },
      include: { asset: true, kit: true, borrower: true },
      orderBy: { dueAt: "asc" },
      take: 10,
    }),
    prisma.asset.findMany({
      where: { warrantyExpiresAt: { gte: now, lte: warrantyHorizon } },
      orderBy: { warrantyExpiresAt: "asc" },
      take: 10,
    }),
    prisma.location.findMany({
      include: { _count: { select: { assets: true } } },
      orderBy: { name: "asc" },
      take: 8,
    }),
    canViewConsumables
      ? prisma.consumable.findMany({
          where: { lowStockThreshold: { not: null } },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const lowStockConsumables = consumablesWithThreshold.filter(
    (c) => c.lowStockThreshold != null && c.quantity <= c.lowStockThreshold,
  );

  const stats = [
    { label: "Total assets", value: totalAssets, href: "/assets" },
    { label: "Checked out", value: checkedOutCount, href: "/checkouts" },
    { label: "Overdue", value: overdueCheckouts.length, href: "/checkouts?filter=overdue" },
    { label: "Warranty expiring (30d)", value: warrantyExpiring.length, href: "/assets" },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          An overview of everything tracked in your inventory.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-shadow hover:shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{s.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overdue checkouts</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {overdueCheckouts.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing overdue right now.</p>
            )}
            {overdueCheckouts.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{c.asset?.name ?? c.kit?.name}</p>
                  <p className="text-muted-foreground">
                    with {c.borrower ? c.borrower.name : "unknown"}
                  </p>
                </div>
                <Badge variant="destructive">
                  due {c.dueAt.toLocaleDateString()}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Warranties expiring soon</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {warrantyExpiring.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing expiring in the next 30 days.</p>
            )}
            {warrantyExpiring.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <p className="font-medium">{a.name}</p>
                <Badge variant="outline">
                  {a.warrantyExpiresAt?.toLocaleDateString()}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        {canViewConsumables && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Consumables running low</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {lowStockConsumables.length === 0 && (
                <p className="text-sm text-muted-foreground">Nothing running low right now.</p>
              )}
              {lowStockConsumables.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <p className="font-medium">{c.name}</p>
                  <Badge variant="destructive">
                    {c.quantity} left (threshold {c.lowStockThreshold})
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assets by location</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {byLocation.map((loc) => (
            <Link
              key={loc.id}
              href={`/locations/${loc.id}`}
              className="rounded-lg border p-3 text-sm hover:bg-muted/50"
            >
              <p className="font-medium">{loc.name}</p>
              <p className="text-muted-foreground">{loc._count.assets} assets</p>
            </Link>
          ))}
          {byLocation.length === 0 && (
            <p className="text-sm text-muted-foreground">No locations yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
