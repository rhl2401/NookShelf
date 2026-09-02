# Changelog

All notable changes are recorded here, one entry per version bump. Versioning policy: every new
feature is a **minor** bump (`0.X.0`); every breaking change is a **major** bump (`X.0.0`) and its
entry always lists **Breaking changes** and **Migration steps** explicitly — anything you need to
do by hand beyond the normal upgrade steps.

Upgrading? Read [README.md § Upgrading an existing instance](README.md#upgrading-an-existing-instance)
first — always back up before pulling a new version.

## 1.3.0

- Optional S3 (or S3-compatible: MinIO, Cloudflare R2, Backblaze B2, etc.) object storage for
  uploaded files, as an alternative to local disk. Set `STORAGE_DRIVER=s3` plus `S3_BUCKET`/
  `S3_REGION` (see [README § Environment variables](README.md#environment-variables)) — leave
  unset to keep the existing local-disk behavior, which remains the default.
- No schema changes. No manual steps for existing instances — local storage keeps working exactly
  as before unless you opt in to `STORAGE_DRIVER=s3`.

## 1.2.0

- Your own profile picture and email-notification preference moved out of the Settings page into
  a "Profile settings" dialog opened from your avatar in the top bar.
- "Settings" is renamed to "Workspace settings" — it's now exclusively workspace-wide
  configuration (branding, OAuth, SMTP, currency, picture size, webhooks, data import/export).
  Non-admins are redirected away instead of seeing an empty page.
- Admins with user administration (`user:manage`) can now edit another person's name and profile
  picture from the People page, via a new "Edit" button per row.
- The People page no longer shows a "Has login" badge — only a "No login" tag for people who
  haven't signed in yet, to reduce visual noise for the common case.
- No schema changes. No manual steps.

## 1.1.0

Rebranded to **NookShelf**.

- Default product name, logo, and favicon now use the NookShelf brand instead of the generic
  "Asset Management" placeholder. The wordmark image appears on the sign-in page when no custom
  branding is configured.
- Admin-configurable branding (Settings → app name, logo, sign-in headline/subtitle, accent color)
  is unchanged — self-hosters can still fully override the default NookShelf branding with their
  own, exactly as before.
- Warmed up the light-theme background/surface colors (cards, sidebar, borders) from pure white to
  a soft cream tone to match the new logo's palette. Dark mode is unchanged.
- No schema changes. No manual steps — this is a purely cosmetic/branding release.

## 1.0.0

Security hardening from a full OWASP Top 10 audit.

- Asset attachment uploads are now restricted to an allow-list of common image/document MIME
  types (previously any file type was accepted and served back with `Content-Disposition: inline`,
  a stored-XSS vector); non-safe-to-render types are now always served as a download regardless
  of their stored MIME type.
- Added baseline security response headers (Content-Security-Policy, X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy, Strict-Transport-Security) across the app.
- CSV/XLSX exports (single-asset export and full data export) now neutralize values that could be
  interpreted as spreadsheet formulas (CSV/formula injection) when opened in Excel or similar.
- The bulk data-import endpoint and the simple assets-CSV import now enforce a 20MB upload limit,
  matching every other upload path in the app.
- Closed a path-traversal gap in attachment storage (write path lacked the containment check the
  read path already had) and an authorization gap on the `/a/<assetTag>` and avatar-serving routes
  (now require `asset:view` like every other asset/file-serving route).
- `scripts/backup.sh` now restricts backup directory permissions to the owner.
- **Breaking change**: `docker-compose.yml` no longer falls back to a hardcoded default Postgres
  password (`assetmgmt`), and the Postgres port is now published to `127.0.0.1` only instead of
  all host interfaces.
  - **Migration steps**: set `POSTGRES_PASSWORD` in your `.env` file before running
    `docker compose up` (see the updated `.env.example`); if you were relying on connecting to
    Postgres from another host over the network, that's no longer possible by default — tunnel
    over SSH or explicitly change the port binding in `docker-compose.yml` instead.

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
