import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PicturesManager } from "@/components/pictures/pictures-manager";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 60;

export default async function PicturesPage({ searchParams }: PageProps<"/pictures">) {
  const session = await auth();
  if (!session?.user.permissions.includes("asset:manage")) redirect("/dashboard");
  const canShare = session.user.permissions.includes("picture:share");
  const personId = session.user.personId;

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : undefined;
  const nameFilter: Prisma.PictureWhereInput = q ? { name: { contains: q, mode: "insensitive" } } : {};

  const [myPictures, myTotal, workspacePictures, workspaceTotal] = await Promise.all([
    personId
      ? prisma.picture.findMany({
          where: { scope: "PERSONAL", ownerId: personId, ...nameFilter },
          include: { _count: { select: { assets: true } } },
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE,
        })
      : Promise.resolve([]),
    personId
      ? prisma.picture.count({ where: { scope: "PERSONAL", ownerId: personId, ...nameFilter } })
      : Promise.resolve(0),
    prisma.picture.findMany({
      where: { scope: "WORKSPACE", ...nameFilter },
      include: { owner: true, _count: { select: { assets: true } } },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.picture.count({ where: { scope: "WORKSPACE", ...nameFilter } }),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pictures</h1>
        <p className="text-sm text-muted-foreground">
          Pictures you upload for an asset are saved here for reuse. Unused ones can be flushed,
          and {canShare ? "you can" : "people with permission can"} share a picture to the
          workspace library so everyone can use it.
        </p>
      </div>

      <PicturesManager
        myPictures={myPictures.map((p) => ({
          id: p.id,
          name: p.name,
          usedCount: p._count.assets,
        }))}
        myTotal={myTotal}
        workspacePictures={workspacePictures.map((p) => ({
          id: p.id,
          name: p.name,
          usedCount: p._count.assets,
          ownerName: p.owner?.name ?? null,
        }))}
        workspaceTotal={workspaceTotal}
        canShare={canShare}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
