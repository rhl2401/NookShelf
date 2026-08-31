"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  MapPin,
  Tags,
  PackageOpen,
  ArrowLeftRight,
  ScanLine,
  Users,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Permission } from "@/lib/permissions";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assets", label: "Assets", icon: Boxes, permission: "asset:view" },
  { href: "/locations", label: "Locations", icon: MapPin, permission: "location:view" },
  { href: "/asset-types", label: "Asset Types", icon: Tags, permission: "asset-type:manage" },
  { href: "/kits", label: "Kits", icon: PackageOpen, permission: "kit:view" },
  { href: "/checkouts", label: "Checkouts", icon: ArrowLeftRight, permission: "checkout:view" },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/people", label: "People", icon: Users, permission: "user:manage" },
  { href: "/roles", label: "Roles", icon: ShieldCheck, permission: "role:manage" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings:manage" },
];

export function Sidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const permissionSet = new Set(permissions);

  return (
    <nav className="flex h-full w-60 shrink-0 flex-col gap-1 border-r bg-background px-3 py-4">
      {NAV_ITEMS.filter((item) => !item.permission || permissionSet.has(item.permission)).map(
        (item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        },
      )}
    </nav>
  );
}
