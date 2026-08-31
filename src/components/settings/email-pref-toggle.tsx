"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { setEmailNotificationsEnabled } from "@/lib/actions/notification-prefs";

export function EmailPrefToggle({ enabled }: { enabled: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onChange(checked: boolean) {
    startTransition(async () => {
      await setEmailNotificationsEnabled(checked);
      toast.success(checked ? "Email alerts on" : "Email alerts off");
      router.refresh();
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={enabled}
        onCheckedChange={(checked) => onChange(Boolean(checked))}
        disabled={isPending}
      />
      Email me about warranty expirations and overdue checkouts
    </label>
  );
}
