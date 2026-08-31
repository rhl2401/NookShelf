import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { KitFormDialog } from "@/components/kits/kit-form-dialog";
import { DeleteKitButton } from "@/components/kits/delete-kit-button";
import { CheckoutDialog } from "@/components/checkouts/checkout-dialog";
import { ReturnCheckoutDialog } from "@/components/checkouts/return-checkout-dialog";
import { Plus } from "lucide-react";

export default async function KitsPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("kit:view")) redirect("/dashboard");
  const canManage = session.user.permissions.includes("kit:manage");
  const canCheckout = session.user.permissions.includes("checkout:manage");

  const [kits, assets, people] = await Promise.all([
    prisma.kit.findMany({
      include: {
        members: { include: { asset: true } },
        checkouts: { where: { status: "OUT" }, include: { borrower: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.asset.findMany({ select: { id: true, name: true, assetTag: true }, orderBy: { name: "asc" } }),
    prisma.person.findMany({ where: { status: { not: "MERGED" } }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kits</h1>
          <p className="text-sm text-muted-foreground">
            Reusable bundles of assets you check out together.
          </p>
        </div>
        {canManage && (
          <KitFormDialog
            trigger={
              <Button>
                <Plus /> New kit
              </Button>
            }
            assets={assets}
          />
        )}
      </div>

      <div className="flex flex-col gap-3">
        {kits.map((kit) => {
          const activeCheckout = kit.checkouts[0];
          return (
            <Card key={kit.id}>
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/kits/${kit.id}`} className="font-medium hover:underline">
                      {kit.name}
                    </Link>
                    <Badge variant="outline">{kit.members.length} assets</Badge>
                    {activeCheckout ? (
                      <Badge variant="secondary">
                        Out with {activeCheckout.borrower.name} · due{" "}
                        {activeCheckout.dueAt.toLocaleDateString()}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Available</Badge>
                    )}
                  </div>
                  {kit.description && (
                    <p className="text-sm text-muted-foreground">{kit.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  {canCheckout &&
                    (activeCheckout ? (
                      <ReturnCheckoutDialog
                        checkoutId={activeCheckout.id}
                        label={kit.name}
                        items={kit.members.map((m) => ({ assetId: m.assetId, name: m.asset.name }))}
                      />
                    ) : (
                      <CheckoutDialog
                        target={{ kind: "kit", id: kit.id, label: kit.name }}
                        people={people}
                      />
                    ))}
                  {canManage && (
                    <>
                      <KitFormDialog
                        trigger={<Button variant="outline">Edit</Button>}
                        assets={assets}
                        kit={{
                          id: kit.id,
                          name: kit.name,
                          description: kit.description,
                          assetIds: kit.members.map((m) => m.assetId),
                        }}
                      />
                      <DeleteKitButton kitId={kit.id} />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {kits.length === 0 && <p className="text-sm text-muted-foreground">No kits yet.</p>}
      </div>
    </div>
  );
}
