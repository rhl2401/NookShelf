import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user.personId) return Response.json([]);

  const notifications = await prisma.notification.findMany({
    where: { personId: session.user.personId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return Response.json(notifications);
}
