import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildLocationTree, flattenLocationTree } from "@/lib/locations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AssetFormDialog } from "@/components/assets/asset-form-dialog";
import { DeleteAssetButton } from "@/components/assets/delete-asset-button";
import { AttachmentsPanel } from "@/components/assets/attachments-panel";
import { AssetPicture } from "@/components/asset-picture";
import { AssetPictureEditor } from "@/components/assets/asset-picture-editor";
import { CheckoutDialog } from "@/components/checkouts/checkout-dialog";
import { ReturnCheckoutDialog } from "@/components/checkouts/return-checkout-dialog";
import { assetStatusBadgeVariant, assetStatusLabel } from "@/lib/asset-status";
import type { AssetFieldDef } from "@/lib/asset-fields";
import { getDefaultCurrency, convertAmount, formatMoney } from "@/lib/currency";

export default async function AssetDetailPage({ params }: PageProps<"/assets/[id]">) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user.permissions.includes("asset:view")) notFound();
  const canManage = session.user.permissions.includes("asset:manage");
  const canCheckout = session.user.permissions.includes("checkout:manage");

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      assetType: true,
      location: true,
      assignedTo: true,
      parentAsset: true,
      childAssets: true,
      attachments: { orderBy: { createdAt: "desc" } },
      tags: { include: { tag: true } },
      auditLogEntries: { include: { actor: true }, orderBy: { createdAt: "desc" }, take: 30 },
      checkouts: { where: { status: "OUT" }, include: { borrower: true } },
    },
  });
  if (!asset) notFound();

  const activeCheckout = asset.checkouts[0];

  const [assetTypes, tree, people, allAssets, myPictures, workspacePictures] = await Promise.all([
    prisma.assetType.findMany({ orderBy: { name: "asc" } }),
    buildLocationTree(),
    prisma.person.findMany({ where: { status: { not: "MERGED" } }, orderBy: { name: "asc" } }),
    prisma.asset.findMany({ select: { id: true, name: true, assetTag: true } }),
    session.user.personId
      ? prisma.picture.findMany({
          where: { scope: "PERSONAL", ownerId: session.user.personId },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    prisma.picture.findMany({
      where: { scope: "WORKSPACE" },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, name: true },
    }),
  ]);
  const flatLocations = flattenLocationTree(tree);
  const fieldSchema = (asset.assetType.fieldSchema as AssetFieldDef[]) ?? [];
  const customFields = (asset.customFields as Record<string, unknown>) ?? {};

  const defaultCurrency = getDefaultCurrency();
  const purchaseCurrency = asset.purchaseCurrency ?? defaultCurrency;
  const convertedPrice =
    asset.purchasePrice && purchaseCurrency !== defaultCurrency
      ? await convertAmount(Number(asset.purchasePrice), purchaseCurrency, defaultCurrency)
      : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/assets" className="text-sm text-muted-foreground hover:underline">
          ← Assets
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {canManage ? (
              <AssetPictureEditor
                assetId={asset.id}
                name={asset.name}
                icon={asset.icon}
                color={asset.iconColor}
                typeIcon={asset.assetType.icon}
                typeColor={asset.assetType.iconColor}
                inheritTypeIcon={asset.assetType.inheritIcon}
                pictureId={asset.primaryPictureId}
                myPictures={myPictures}
                workspacePictures={workspacePictures}
              />
            ) : (
              <AssetPicture
                pictureId={asset.primaryPictureId}
                icon={asset.icon}
                color={asset.iconColor}
                typeIcon={asset.assetType.icon}
                typeColor={asset.assetType.iconColor}
                inheritTypeIcon={asset.assetType.inheritIcon}
                alt={asset.name}
                size="xl"
              />
            )}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{asset.name}</h1>
              <p className="font-mono text-sm text-muted-foreground">{asset.assetTag}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={`/labels/${asset.id}`} target="_blank" rel="noreferrer" />}
            >
              Print label
            </Button>
            {canCheckout &&
              (activeCheckout ? (
                <ReturnCheckoutDialog
                  checkoutId={activeCheckout.id}
                  label={asset.name}
                  items={[{ assetId: asset.id, name: asset.name }]}
                />
              ) : (
                !["RETIRED", "LOST", "DISPOSED"].includes(asset.status) && (
                  <CheckoutDialog
                    target={{ kind: "asset", id: asset.id, label: asset.name }}
                    people={people}
                  />
                )
              ))}
            {canManage && (
              <>
                <AssetFormDialog
                  trigger={<Button variant="outline">Edit</Button>}
                  assetTypes={assetTypes}
                  flatLocations={flatLocations}
                  people={people}
                  assetOptions={allAssets}
                  defaultCurrency={defaultCurrency}
                  asset={{
                    id: asset.id,
                    name: asset.name,
                    assetTypeId: asset.assetTypeId,
                    locationId: asset.locationId,
                    assignedToId: asset.assignedToId,
                    parentAssetId: asset.parentAssetId,
                    status: asset.status,
                    notes: asset.notes,
                    purchaseDate: asset.purchaseDate,
                    purchasePrice: asset.purchasePrice?.toString() ?? null,
                    purchaseCurrency: asset.purchaseCurrency,
                    vendor: asset.vendor,
                    warrantyExpiresAt: asset.warrantyExpiresAt,
                    customFields: asset.customFields,
                    tags: asset.tags.map((t) => t.tag.name),
                  }}
                />
                <DeleteAssetButton assetId={asset.id} />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="Type">
              <Badge variant="outline">{asset.assetType.name}</Badge>
            </Row>
            <Row label="Status">
              <Badge variant={assetStatusBadgeVariant(asset.status)}>
                {assetStatusLabel(asset.status)}
              </Badge>
            </Row>
            <Row label="Location">
              {asset.location ? (
                <Link href={`/locations/${asset.location.id}`} className="hover:underline">
                  {asset.location.name}
                </Link>
              ) : (
                "—"
              )}
            </Row>
            <Row label="Assigned to">{asset.assignedTo?.name ?? "—"}</Row>
            {activeCheckout && (
              <Row label="Checked out to">
                {activeCheckout.borrower.name} · due {activeCheckout.dueAt.toLocaleDateString()}
              </Row>
            )}
            <Row label="Part of">
              {asset.parentAsset ? (
                <Link href={`/assets/${asset.parentAsset.id}`} className="hover:underline">
                  {asset.parentAsset.name}
                </Link>
              ) : (
                "—"
              )}
            </Row>
            <Row label="Purchased">
              {asset.purchaseDate ? asset.purchaseDate.toLocaleDateString() : "—"}
              {asset.purchasePrice != null && (
                <>
                  {" · "}
                  {formatMoney(Number(asset.purchasePrice), purchaseCurrency)}
                  {convertedPrice !== null && (
                    <span className="text-muted-foreground">
                      {" "}
                      (≈ {formatMoney(convertedPrice, defaultCurrency)})
                    </span>
                  )}
                </>
              )}
            </Row>
            <Row label="Vendor">{asset.vendor ?? "—"}</Row>
            <Row label="Warranty">
              {asset.warrantyExpiresAt ? asset.warrantyExpiresAt.toLocaleDateString() : "—"}
            </Row>
            {asset.notes && <Row label="Notes">{asset.notes}</Row>}
            <Row label="Tags">
              <div className="flex flex-wrap gap-1">
                {asset.tags.map((t) => (
                  <Badge key={t.tag.name} variant="outline">
                    {t.tag.name}
                  </Badge>
                ))}
                {asset.tags.length === 0 && "—"}
              </div>
            </Row>
          </CardContent>
        </Card>

        {fieldSchema.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{asset.assetType.name} fields</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {fieldSchema.map((f) => (
                <Row key={f.key} label={f.label}>
                  {formatFieldValue(customFields[f.key])}
                </Row>
              ))}
            </CardContent>
          </Card>
        )}

        {asset.childAssets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contains</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {asset.childAssets.map((child) => (
                <Link
                  key={child.id}
                  href={`/assets/${child.id}`}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-muted/50"
                >
                  {child.name}
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <AttachmentsPanel
              assetId={asset.id}
              attachments={asset.attachments}
              canManage={canManage}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {asset.auditLogEntries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between border-b pb-2 last:border-0">
              <span>
                <Badge variant="outline" className="mr-2">
                  {entry.action}
                </Badge>
                {entry.actor?.name ?? "System"}
              </span>
              <span className="text-muted-foreground">
                {entry.createdAt.toLocaleString()}
              </span>
            </div>
          ))}
          {asset.auditLogEntries.length === 0 && (
            <p className="text-muted-foreground">No history yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function formatFieldValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    const obj = value as { value?: number; unit?: string };
    if ("value" in obj) return `${obj.value ?? ""} ${obj.unit ?? ""}`.trim();
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
