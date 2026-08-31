export const ASSET_STATUSES = [
  { value: "IN_USE", label: "In use" },
  { value: "IN_STORAGE", label: "In storage" },
  { value: "CHECKED_OUT", label: "Checked out" },
  { value: "RETIRED", label: "Retired" },
  { value: "LOST", label: "Lost" },
  { value: "DISPOSED", label: "Disposed" },
] as const;

export function assetStatusLabel(status: string) {
  return ASSET_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function assetStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "IN_USE":
      return "default";
    case "CHECKED_OUT":
      return "secondary";
    case "LOST":
    case "DISPOSED":
      return "destructive";
    default:
      return "outline";
  }
}
