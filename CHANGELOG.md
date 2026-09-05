# Changelog

All notable changes are recorded here, one entry per version bump. Versioning policy: every new
feature is a **minor** bump (`0.X.0`); every breaking change is a **major** bump (`X.0.0`) and its
entry always lists **Breaking changes** and **Migration steps** explicitly — anything you need to
do by hand beyond the normal upgrade steps.

Upgrading? Read [README.md § Upgrading an existing instance](README.md#upgrading-an-existing-instance)
first — always back up before pulling a new version.

## 1.9.0

- Asset types now have an "Assets of this type inherit its icon by default" toggle. Previously,
  an asset with no icon/picture of its own always fell back to showing its asset type's icon —
  fine for something like Cable where every asset really does share one look, but misleading for
  a catch-all type like Generic where the members are too varied for one shared icon to make
  sense. Turn it off and un-iconed assets of that type show no icon instead.
- The built-in "Generic" type now ships with inheritance turned off by default, both for new
  installs and (via a one-time data migration) existing ones.
- Schema change: adds `AssetType.inheritIcon` (defaults to `true`, preserving today's behavior for
  every existing type except Generic). Applied automatically via `prisma migrate deploy` — no
  manual steps.

## 1.8.0

- New **Consumables** section: track identical, stock-tracked items that get used up (soap,
  labels, and the like) — one row per product with a quantity-on-hand count, instead of one row
  per physical item like Assets. Set an optional low-stock threshold to get a warning badge in
  the list and a "Consumables running low" card on the Dashboard. A quick +/- stepper adjusts
  quantity without opening the edit dialog. Gated behind new `consumable:view`/`consumable:manage`
  permissions (Admin gets both automatically; Manager gets both; Member and Viewer get
  `consumable:view`).
- Consumables are included in the data import/export bundle (JSON/CSV/XLSX), alongside locations,
  asset types, assets, and kits.
- Schema change: adds the `Consumable` model. Applied automatically via `prisma migrate deploy` —
  no manual steps. Existing roles get the new permissions automatically on next restart (the seed
  script re-upserts every system role's permissions on startup).

## 1.7.0

- The "New asset type" dialog now offers the Cable/Vehicle/Battery starter templates directly —
  pick one to pre-fill name, category, icon, and custom fields (still fully editable before you
  create), instead of needing the separate "Import template" button. That button is still there
  for pasting/uploading a shared or custom template bundle.
- Every button now shows a pointer cursor on hover — many had been showing the browser's default
  arrow cursor instead, since that's the unstyled default for `<button>` elements.
- No schema changes. No manual steps.

## 1.6.0

- Better diagnostics for failed sign-in, prompted by how hard the 1.5.2 `invalid_state` bug was to
  debug from our own logs: Auth.js's default logger only ever printed a truncated, minified stack
  trace and silently dropped `error.cause` — which is exactly where the OAuth provider's actual
  error/error_description lives. `src/auth.config.ts` now logs the full cause (redacting anything
  that looks like a secret/token/password first) on every sign-in error.
- The login page now shows a short, generic reason when sign-in fails (e.g. "That provider
  couldn't complete sign-in. Try again, or try a different provider.") instead of failing
  silently. Deliberately generic and modeled on Auth.js's own built-in wording — this is a public,
  pre-authentication page, so the actual technical detail (provider error code, stack trace) only
  ever goes to the server log above, never the browser.
- No schema changes. No manual steps.

## 1.5.2

- Fixes generic OIDC sign-in against providers that enforce the OAuth2 `state` parameter (e.g.
  Pocket ID) — the authorization request `next-auth` built for the `generic-oidc` provider only
  ever sent PKCE, never `state`, so strict providers rejected it outright with `invalid_state`
  before the request ever reached NookShelf. Google and Microsoft Entra ID sign-in were unaffected
  (they use next-auth's built-in provider presets, which already send both).
- No schema changes. Existing instances: pull the new image and restart — no other steps needed.

## 1.5.1

- New `AUTH_TRUST_HOST` environment variable. If you self-host behind your own reverse proxy
  (nginx, Caddy, Traefik, etc.) with a real domain, sign-in previously failed with Auth.js's
  `UntrustedHost` error — Auth.js only auto-trusts the request host on Vercel/Cloudflare Pages, not
  in a plain Docker deployment. Set `AUTH_TRUST_HOST=true` in `.env` to fix it (default stays
  `false`, since blindly trusting the host is only safe when your own reverse proxy — not the
  public internet directly — controls the `Host` header).
- No schema changes. Existing instances: if you're behind a reverse proxy and were hitting this,
  add `AUTH_TRUST_HOST=true` to `.env` and restart — no image pull required, this is purely an
  environment variable.

## 1.5.0

**Fixes a deployment-blocking bug in `v1.4.0`'s Docker setup** — if `POSTGRES_PASSWORD` contained
a `/`, `+`, `=`, `@`, or a few other URL-special characters (a real possibility with the
`openssl rand -base64 24` this project itself suggested for it), the app would fail to start with
Prisma error `P1013: invalid port number in database URL`, in a restart loop. `docker-compose.yml`
built `DATABASE_URL` by pasting the password straight into a connection string with no
URL-encoding, so a `/` in the password, for example, got read as a path separator and corrupted
everything after it.

- `docker-compose.yml` now passes `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` to the `app`
  container as separate variables instead of pre-building the connection string.
- `docker-entrypoint.sh` builds `DATABASE_URL` itself, URL-encoding each part — safe with any
  password, whatever characters it contains.
- `.env.example`'s suggested generator for `POSTGRES_PASSWORD` changed from
  `openssl rand -base64 24` to `openssl rand -hex 24` (hex output has no special characters at
  all) — this also covers `next dev`/local development, which builds its own `DATABASE_URL`
  directly from `.env` and isn't touched by the `docker-entrypoint.sh` fix above.

**If you deployed `v1.4.0` and hit this**: regenerate `POSTGRES_PASSWORD` with
`openssl rand -hex 24` and update it in both your `.env` and, if you'd previously started the `db`
container with the old password, connect and change it there too
(`ALTER USER assetmgmt WITH PASSWORD '...'` inside the container) — or simplest, if you have no
data yet, remove the `db_data` volume and let it re-initialize with the new password. Then
`docker compose pull && docker compose up -d`.

No schema changes.

## 1.4.0

- New background shade picker: 5 whites from cool to warm ("Frost", "Cool", "Neutral", "Warm",
  "Cream"). Anyone can pick their own from Profile settings (avatar menu → Profile settings), or
  leave it on the workspace default. Admins set that default from Workspace settings → Default
  background.
- Schema change: adds `Person.backgroundShade` (nullable) and
  `WorkspaceSettings.defaultBackgroundShade` (defaults to `"cream"`, matching the current look).
  Applied automatically via `prisma migrate deploy` — no manual steps; existing instances keep
  today's cream background as the default for everyone until changed.

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
