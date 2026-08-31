"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setPersonActive } from "@/lib/actions/people";

export function ToggleActiveButton({
  personId,
  active,
}: {
  personId: string;
  active: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onClick() {
    startTransition(async () => {
      try {
        await setPersonActive(personId, !active);
        toast.success(active ? "Person deactivated" : "Person reactivated");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update");
      }
    });
  }

  return (
    <Button variant="outline" onClick={onClick} disabled={isPending}>
      {active ? "Deactivate" : "Reactivate"}
    </Button>
  );
}
