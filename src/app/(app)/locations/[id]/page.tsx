import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildLocationTree, flattenLocationTree, getLocationPath } from "@/lib/locations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LocationFormDialog } from "@/components/locations/location-form-dialog";
import { DeleteLocationDialog } from "@/components/locations/delete-location-dialog";
import { AssetPicture } from "@/components/asset-picture";

export default async function LocationDetailPage({
  params,
}: PageProps<"/locations/[id]">) {
  const { id } = await params;
  const session = await auth();
  const canManage = Boolean(session?.user.permissions.includes("location:manage"));

  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      children: { include: { _count: { select: { assets: true } } }, orderBy: { name: "asc" } },
      assets: { include: { assetType: true }, orderBy: { name: "asc" } },
      _count: { select: { children: true, assets: true } },
    },
  });
  if (!location) notFound();

  const [path, tree, myPictures, workspacePictures] = await Promise.all([
    getLocationPath(id),
    buildLocationTree(),
    session?.user.personId
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/locations" className="hover:underline">
            Locations
          </Link>
          {path.map((p) => (
            <span key={p.id} className="flex items-center gap-1">
              <ChevronRight className="size-3.5" />
              <Link href={`/locations/${p.id}`} className="hover:underline">
                {p.name}
              </Link>
            </span>
          ))}
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AssetPicture
              pictureId={location.primaryPictureId}
              icon={location.icon}
              color={location.iconColor}
              alt={location.name}
              size="lg"
            />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{location.name}</h1>
              {location.code && (
                <p className="font-mono text-xs text-muted-foreground">{location.code}</p>
              )}
            </div>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <LocationFormDialog
                trigger={<Button variant="outline">Edit</Button>}
                flatLocations={flatLocations}
                location={location}
                myPictures={myPictures}
                workspacePictures={workspacePictures}
              />
              <DeleteLocationDialog
                locationId={location.id}
                hasChildren={location._count.children > 0}
                assetCount={location._count.assets}
                flatLocations={flatLocations}
              />
            </div>
          )}
        </div>
        {location.notes && <p className="mt-1 text-sm text-muted-foreground">{location.notes}</p>}
      </div>

      {location.children.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sub-locations</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {location.children.map((child) => (
              <Link
                key={child.id}
                href={`/locations/${child.id}`}
                className="rounded-lg border p-3 text-sm hover:bg-muted/50"
              >
                <p className="font-medium">{child.name}</p>
                <p className="text-muted-foreground">{child._count.assets} assets</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assets here ({location.assets.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {location.assets.map((asset) => (
            <Link
              key={asset.id}
              href={`/assets/${asset.id}`}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/50"
            >
              <span className="font-medium">{asset.name}</span>
              <span className="flex items-center gap-2 text-muted-foreground">
                <Badge variant="outline">{asset.assetType.name}</Badge>
                {asset.assetTag}
              </span>
            </Link>
          ))}
          {location.assets.length === 0 && (
            <p className="text-sm text-muted-foreground">No assets here yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
