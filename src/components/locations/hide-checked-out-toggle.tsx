"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";

export function HideCheckedOutToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const checked = searchParams.get("hideCheckedOut") === "1";

  function toggle(next: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("hideCheckedOut", "1");
    else params.delete("hideCheckedOut");
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <label className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
      <Checkbox checked={checked} onCheckedChange={(c) => toggle(c === true)} />
      Hide checked-out
    </label>
  );
}
