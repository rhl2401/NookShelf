import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/nav/sidebar";
import { Topbar } from "@/components/nav/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.active) redirect("/login?error=deactivated");

  return (
    <div className="flex h-screen flex-col">
      <Topbar user={session.user} />
      <div className="flex min-h-0 flex-1">
        <Sidebar permissions={session.user.permissions} />
        <main className="min-w-0 flex-1 overflow-y-auto bg-muted/20 p-6">{children}</main>
      </div>
    </div>
  );
}
