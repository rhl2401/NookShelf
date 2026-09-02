import Link from "next/link";
import { DEFAULT_LOGO_URL } from "@/lib/branding-shared";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { AssetTypeIcon } from "@/components/asset-type-icon";
import { UserMenu, type ProfileMenuData } from "@/components/nav/user-menu";

export function Topbar({
  user,
  profile,
  appName,
  logoUrl,
  icon,
  iconColor,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  profile: ProfileMenuData | null;
  appName: string;
  logoUrl?: string | null;
  icon?: string | null;
  iconColor?: string | null;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
      <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={appName} className="h-6 max-w-32 object-contain" />
        ) : icon ? (
          <AssetTypeIcon icon={icon} color={iconColor} size="sm" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={DEFAULT_LOGO_URL} alt={appName} className="size-6 object-contain" />
        )}
        <span className="hidden sm:inline">{appName}</span>
      </Link>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <UserMenu user={user} profile={profile} />
      </div>
    </header>
  );
}
