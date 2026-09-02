"use client";

import { useState } from "react";
import { LogOut, UserCircle } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileSettingsDialog } from "@/components/settings/profile-settings-dialog";

export function UserMenu({
  user,
  profile,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  profile: { personId: string; hasAvatar: boolean; emailNotificationsEnabled: boolean } | null;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const initials = (user.name || user.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" className="h-9 gap-2 px-2" />}>
          <Avatar className="size-7">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="max-w-56 truncate font-normal text-muted-foreground">
              {user.email}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {profile && (
            <DropdownMenuItem
              nativeButton
              render={<button type="button" className="flex w-full items-center gap-2" />}
              onClick={() => setProfileOpen(true)}
            >
              <UserCircle className="size-4" /> Profile settings
            </DropdownMenuItem>
          )}
          <form action={signOutAction}>
            <DropdownMenuItem
              nativeButton
              render={<button type="submit" className="flex w-full items-center gap-2" />}
            >
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>

      {profile && (
        <ProfileSettingsDialog
          open={profileOpen}
          onOpenChange={setProfileOpen}
          personId={profile.personId}
          name={user.name ?? ""}
          hasAvatar={profile.hasAvatar}
          oauthImage={user.image}
          emailNotificationsEnabled={profile.emailNotificationsEnabled}
        />
      )}
    </>
  );
}
