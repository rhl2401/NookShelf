"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

type NotificationDto = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    const res = await fetch("/api/notifications");
    if (res.ok) setItems(await res.json());
  }

  useEffect(() => {
    // Initial + polling fetch — setItems only ever runs after the awaited
    // response resolves, in a later task, not synchronously during this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const unreadCount = items.filter((i) => !i.isRead).length;

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isRead: true } : i)));
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative" />}>
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {items.length === 0 && (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </div>
        )}
        {items.slice(0, 8).map((item) => (
          <DropdownMenuItem
            key={item.id}
            className="flex flex-col items-start gap-0.5 whitespace-normal"
            onClick={() => markRead(item.id)}
          >
            <a href={item.link ?? "#"} className="w-full">
              <span className={item.isRead ? "text-muted-foreground" : "font-medium"}>
                {item.title}
              </span>
              {item.body && (
                <p className="text-xs text-muted-foreground">{item.body}</p>
              )}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
