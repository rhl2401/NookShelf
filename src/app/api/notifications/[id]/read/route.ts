import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user.personId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  await prisma.notification.updateMany({
    where: { id, personId: session.user.personId },
    data: { isRead: true },
  });

  return Response.json({ ok: true });
}
