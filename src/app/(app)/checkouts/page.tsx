import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ReturnCheckoutDialog } from "@/components/checkouts/return-checkout-dialog";

export default async function CheckoutsPage({ searchParams }: PageProps<"/checkouts">) {
  const session = await auth();
  if (!session?.user.permissions.includes("checkout:view")) redirect("/dashboard");
  const canManage = session.user.permissions.includes("checkout:manage");

  const sp = await searchParams;
  const filter = typeof sp.filter === "string" ? sp.filter : "out";

  const now = new Date();
  const checkouts = await prisma.checkout.findMany({
    where:
      filter === "overdue"
        ? { status: "OUT", dueAt: { lt: now } }
        : filter === "returned"
          ? { status: "RETURNED" }
          : filter === "all"
            ? {}
            : { status: "OUT" },
    include: {
      asset: true,
      kit: true,
      borrower: true,
      items: { include: { asset: true } },
    },
    orderBy: { checkedOutAt: "desc" },
    take: 100,
  });

  const tabs = [
    { key: "out", label: "Checked out" },
    { key: "overdue", label: "Overdue" },
    { key: "returned", label: "Returned" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Checkouts</h1>
        <p className="text-sm text-muted-foreground">
          Everything currently out, overdue, or returned — assets and kits alike.
        </p>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/checkouts?filter=${tab.key}`}
            className={
              "border-b-2 px-3 py-2 text-sm font-medium " +
              (filter === tab.key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground")
            }
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {checkouts.map((c) => {
          const label = c.asset?.name ?? c.kit?.name ?? "Unknown";
          const overdue = c.status === "OUT" && c.dueAt < now;
          return (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    {c.asset ? (
                      <Link href={`/assets/${c.asset.id}`} className="font-medium hover:underline">
                        {label}
                      </Link>
                    ) : c.kit ? (
                      <Link href={`/kits/${c.kit.id}`} className="font-medium hover:underline">
                        {label}
                      </Link>
                    ) : (
                      <span className="font-medium">{label}</span>
                    )}
                    <Badge variant="outline">{c.kind}</Badge>
                    {c.status === "OUT" && (
                      <Badge variant={overdue ? "destructive" : "secondary"}>
                        {overdue ? "Overdue" : "Out"}
                      </Badge>
                    )}
                    {c.status === "RETURNED" && <Badge variant="outline">Returned</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {c.borrower.name} · out {c.checkedOutAt.toLocaleDateString()} ·{" "}
                    {c.returnedAt
                      ? `returned ${c.returnedAt.toLocaleDateString()}`
                      : `due ${c.dueAt.toLocaleDateString()}`}
                  </p>
                </div>
                {canManage && c.status === "OUT" && (
                  <ReturnCheckoutDialog
                    checkoutId={c.id}
                    label={label}
                    items={c.items.map((i) => ({ assetId: i.assetId, name: i.asset.name }))}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
        {checkouts.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here.</p>
        )}
      </div>
    </div>
  );
}
