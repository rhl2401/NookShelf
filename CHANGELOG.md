# Changelog

All notable changes are recorded here, one entry per version bump. Versioning policy: every new
feature is a **minor** bump (`0.X.0`); every breaking change is a **major** bump (`X.0.0`) and its
entry always lists **Breaking changes** and **Migration steps** explicitly — anything you need to
do by hand beyond the normal upgrade steps.

Upgrading? Read [README.md § Upgrading an existing instance](README.md#upgrading-an-existing-instance)
first — always back up before pulling a new version.

## 0.4.0

- Documented, scripted upgrade path for self-hosted instances: `scripts/backup.sh` dumps the
  database and uploaded files before an upgrade, `scripts/restore.sh` restores from one. See
  README.md "Upgrading an existing instance".
- No schema changes. No manual steps — migrations already applied automatically on container
  start (`prisma migrate deploy` in `docker-entrypoint.sh`); this release just adds the safety
  net around that, and documents it clearly for the first time.

## 0.3.0

- Sidebar entries gated by an admin-exclusive permission (People, Roles, Settings) now show a
  small "Admin" tag. Every workspace-wide card on the Settings page shows a "Workspace" tag.
- No schema changes. No manual steps.

## 0.2.0

- **Asset type templates**: Cable, Vehicle, and Battery ship as importable starter templates
  instead of being auto-created for every workspace. Any asset type can be exported as portable
  JSON (or several bundled together) to share between workspaces, and re-imported elsewhere.
  - Existing workspaces keep whatever asset types they already had — this only changes what gets
    seeded for brand-new workspaces.
- **Admin-configurable branding**: app name, logo (or an icon from the shared library), sign-in
  headline/subtitle, and a single workspace accent color, all editable from Settings.
- Creating a new asset now lets you set its icon/picture immediately, instead of only being able
  to set it after creation from the asset's own page.
- Schema changes: adds `WorkspaceSettings` branding/accent-color columns. Applied automatically —
  no manual steps.

## 0.1.0

Initial release. OAuth-only auth (Google/Microsoft/generic OIDC) with role-based access control;
locations with nested hierarchy; asset types with custom field schemas; asset CRUD with tags and
multi-currency pricing; kits and a unified checkout system; QR labeling and camera/barcode
scanning; notifications, webhooks, and settings; full data import/export (JSON, CSV, XLSX); a
reusable picture library with per-asset/type/kit icon and photo overrides; profile pictures.
