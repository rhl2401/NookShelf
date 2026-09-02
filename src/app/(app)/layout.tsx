import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/nav/sidebar";
import { Topbar } from "@/components/nav/topbar";
import { getWorkspaceBranding } from "@/lib/actions/workspace-settings";
import { DEFAULT_APP_NAME } from "@/lib/branding-shared";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.active) redirect("/login?error=deactivated");

  const [person, branding] = await Promise.all([
    session.user.personId
      ? prisma.person.findUnique({
          where: { id: session.user.personId },
          select: { avatarPath: true, emailNotificationsEnabled: true },
        })
      : null,
    getWorkspaceBranding(),
  ]);
  const image = person?.avatarPath ? `/api/avatars/${session.user.personId}` : session.user.image;
  const appName = branding.appName ?? DEFAULT_APP_NAME;
  const logoUrl = branding.hasLogo ? `/api/branding/logo?v=${branding.updatedAt?.getTime()}` : null;
  const profile =
    person && session.user.personId
      ? {
          personId: session.user.personId,
          hasAvatar: Boolean(person.avatarPath),
          emailNotificationsEnabled: person.emailNotificationsEnabled,
        }
      : null;

  return (
    <div className="flex h-screen flex-col">
      <Topbar
        user={{ ...session.user, image }}
        profile={profile}
        appName={appName}
        logoUrl={logoUrl}
        icon={branding.icon}
        iconColor={branding.iconColor}
      />
      <div className="flex min-h-0 flex-1">
        <Sidebar permissions={session.user.permissions} />
        <main className="min-w-0 flex-1 overflow-y-auto bg-muted/20 p-6">{children}</main>
      </div>
    </div>
  );
}
