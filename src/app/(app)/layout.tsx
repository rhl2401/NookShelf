import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/nav/sidebar";
import { Topbar } from "@/components/nav/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.active) redirect("/login?error=deactivated");

  const person = session.user.personId
    ? await prisma.person.findUnique({
        where: { id: session.user.personId },
        select: { avatarPath: true },
      })
    : null;
  const image = person?.avatarPath ? `/api/avatars/${session.user.personId}` : session.user.image;

  return (
    <div className="flex h-screen flex-col">
      <Topbar user={{ ...session.user, image }} />
      <div className="flex min-h-0 flex-1">
        <Sidebar permissions={session.user.permissions} />
        <main className="min-w-0 flex-1 overflow-y-auto bg-muted/20 p-6">{children}</main>
      </div>
    </div>
  );
}
