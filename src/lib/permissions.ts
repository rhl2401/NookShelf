export const PERMISSIONS = [
  "asset:view",
  "asset:manage",
  "location:view",
  "location:manage",
  "asset-type:manage",
  "kit:view",
  "kit:manage",
  "checkout:view",
  "checkout:manage",
  "consumable:view",
  "consumable:manage",
  "user:manage",
  "role:manage",
  "settings:manage",
  "picture:share",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "asset:view": "View assets",
  "asset:manage": "Create, edit, delete, move, and assign assets",
  "location:view": "View locations",
  "location:manage": "Create, edit, and delete locations",
  "asset-type:manage": "Create and edit asset types and their custom fields",
  "kit:view": "View kits",
  "kit:manage": "Create, edit, and delete kits",
  "checkout:view": "View checkouts",
  "checkout:manage": "Check assets/kits out and in",
  "consumable:view": "View consumables",
  "consumable:manage": "Create, edit, and delete consumables, and adjust their quantity",
  "user:manage": "Manage users, people, and merges",
  "role:manage": "Create and edit roles and permissions",
  "settings:manage": "Manage system settings (OAuth, notifications, webhooks)",
  "picture:share": "Share personal pictures to the workspace-wide picture library",
};

export const DEFAULT_ROLES: Array<{
  name: string;
  description: string;
  permissions: Permission[];
}> = [
  {
    name: "Admin",
    description: "Full access to everything, including user and role management.",
    permissions: [...PERMISSIONS],
  },
  {
    name: "Manager",
    description: "Can manage assets, locations, kits, consumables, and checkouts, but not users or roles.",
    permissions: [
      "asset:view",
      "asset:manage",
      "location:view",
      "location:manage",
      "asset-type:manage",
      "kit:view",
      "kit:manage",
      "checkout:view",
      "checkout:manage",
      "consumable:view",
      "consumable:manage",
      "picture:share",
    ],
  },
  {
    name: "Member",
    description: "Can view everything and check assets/kits out to themselves.",
    permissions: [
      "asset:view",
      "location:view",
      "kit:view",
      "checkout:view",
      "checkout:manage",
      "consumable:view",
    ],
  },
  {
    name: "Viewer",
    description: "Read-only access.",
    permissions: ["asset:view", "location:view", "kit:view", "checkout:view", "consumable:view"],
  },
];

export function hasPermission(
  personPermissions: Iterable<string>,
  required: Permission,
): boolean {
  const set = personPermissions instanceof Set ? personPermissions : new Set(personPermissions);
  return set.has(required);
}
