import { Badge } from "@/components/ui/badge";

/** Marks a Settings card as applying to the whole workspace, not just the current user. */
export function WorkspaceBadge() {
  return (
    <Badge variant="secondary" className="text-[10px] font-normal">
      Workspace
    </Badge>
  );
}
