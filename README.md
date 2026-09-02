<p align="center">
  <img src="public/NookShelf_repositoty_opengraph.jpg" alt="" width="400">
</p>

Self-hosted asset tracking for home and small-team use — locations, asset types with custom
fields, kits, checkout/return, QR labeling, and notifications.

## Running with Docker (recommended)

1. Copy `.env.example` to `.env` and fill in at least `POSTGRES_PASSWORD` and `AUTH_SECRET`
   (generate both with `openssl rand -base64 32`, for example) and one OAuth provider's
   credentials.
2. `docker compose up -d --build`
3. Open http://<ip>:3000 — the first person to sign in becomes Admin automatically.

The `app` container runs `prisma migrate deploy` and seeds default roles/asset types on every
start (both are idempotent), then starts the server. Uploaded files persist in the `uploads`
Docker volume; the database persists in `db_data`.


## Environment variables

All variables live in `.env` (copy `.env.example` to start). "Required" means the app/Compose
won't behave correctly (or won't start) without it — everything else is optional and either
disables a feature when blank or falls back to its default.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `POSTGRES_PASSWORD` | Yes | — | Password for the Postgres user. Docker Compose refuses to start without it (no weak default). |
| `DATABASE_URL` | Yes, for local dev only | — | Full Postgres connection string, used by `next dev`/`next start` when running outside Docker. Docker Compose ignores this and builds its own from the `POSTGRES_*` variables below. |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` | Public base URL of the app — used to build OAuth callback URLs. |
| `AUTH_SECRET` | Yes | — | Random secret used to sign session JWTs. Generate with `openssl rand -base64 32`. |
| `AUTH_DEV_LOGIN` | No | `false` | Dev-only login bypass (pick/create a test user, no OAuth needed). Only takes effect under `next dev` — structurally disabled in the Docker image regardless. Never set in a real deployment. |
| `AUTH_GOOGLE_ID` | No¹ | — | Google OAuth client ID. Leave blank to hide Google on the login page. |
| `AUTH_GOOGLE_SECRET` | No¹ | — | Google OAuth client secret. |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | No¹ | — | Microsoft Entra ID (Azure AD) application/client ID. |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | No¹ | — | Microsoft Entra ID client secret. |
| `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | No¹ | — | Microsoft Entra ID (tenant-specific) issuer URL. |
| `AUTH_GENERIC_OIDC_ID` | No¹ | — | Client ID for any other OIDC provider. |
| `AUTH_GENERIC_OIDC_SECRET` | No¹ | — | Client secret for the generic OIDC provider. |
| `AUTH_GENERIC_OIDC_ISSUER` | No¹ | — | Issuer URL for the generic OIDC provider. |
| `AUTH_GENERIC_OIDC_NAME` | No | `Single Sign-On` | Button label shown for the generic OIDC provider ("Continue with ..."). |
| `SMTP_HOST` | No | — | SMTP server hostname. Leave blank to disable email notifications entirely. |
| `SMTP_PORT` | No | `587` | SMTP server port. |
| `SMTP_USER` | No | — | SMTP username, if the server requires auth. |
| `SMTP_PASSWORD` | No | — | SMTP password, if the server requires auth. |
| `SMTP_FROM` | No | `NookShelf <noreply@example.com>` | "From" address on outgoing notification emails. |
| `UPLOADS_DIR` | No | `./uploads` | Where uploaded files are stored on disk. Only used when `STORAGE_DRIVER=local`. |
| `STORAGE_DRIVER` | No | `local` | File storage backend: `local` (disk, under `UPLOADS_DIR`) or `s3` (object storage). |
| `S3_BUCKET` | No² | — | Bucket name for uploaded files (attachments, pictures, avatars, logos). |
| `S3_REGION` | No² | — | AWS region (or your S3-compatible provider's region). |
| `S3_ACCESS_KEY_ID` | No | — | Access key. Omit to use the default AWS credential chain (e.g. an IAM role). |
| `S3_SECRET_ACCESS_KEY` | No | — | Secret key, paired with `S3_ACCESS_KEY_ID`. |
| `S3_ENDPOINT` | No | — | Custom endpoint for S3-compatible providers (MinIO, Cloudflare R2, Backblaze B2, etc.). |
| `S3_FORCE_PATH_STYLE` | No | `false` | Set `true` for providers (e.g. MinIO) that need path-style requests instead of virtual-hosted-style. |
| `S3_PREFIX` | No | — | Key prefix within the bucket, if you're sharing it with other apps. |
| `DEFAULT_CURRENCY` | No | `EUR` | Currency purchase prices are converted to and displayed in by default. |
| `POSTGRES_USER` | No | `assetmgmt` | Postgres username. Docker Compose only. |
| `POSTGRES_DB` | No | `assetmgmt` | Postgres database name. Docker Compose only. |
| `POSTGRES_PORT` | No | `5432` | Host port the Postgres container's `5432` is bound to (`127.0.0.1` only, not exposed to the network). Docker Compose only. |
| `APP_PORT` | No | `3000` | Host port the app container's `3000` is bound to. Docker Compose only. |

¹ Not individually required, but at least one full OAuth/OIDC provider group needs to be
configured for anyone to actually sign in (aside from the dev-only bypass).

² Required, but only when `STORAGE_DRIVER=s3` — ignored otherwise.

Redirect URI for all providers: `<NEXTAUTH_URL>/api/auth/callback/<provider>` (e.g.
`http://localhost:3000/api/auth/callback/google`).

## Upgrading an existing instance

1. **Back up first**: `npm run backup` (or `scripts/backup.sh` directly) dumps the database and
   uploaded files to `backups/<timestamp>/`. Do this before every upgrade — it takes seconds and
   costs nothing.
2. Check `CHANGELOG.md` for the version(s) you're jumping — most releases are drop-in, but it
   calls out anything that needs a manual step (new required env var, etc.).
3. Pull the new code/image, then `docker compose up -d --build`.
4. On startup, the `app` container automatically runs `prisma migrate deploy`, applying any
   migrations added since your last upgrade — non-interactively, and only the ones not already
   applied (tracked in the `_prisma_migrations` table), so this is safe to run on every restart,
   not just upgrades. If a migration fails, the container exits before starting the server
   instead of serving against a half-migrated schema — check `docker compose logs app`.
5. If something's wrong after upgrading, `scripts/restore.sh backups/<timestamp>` restores the
   database and uploads from a backup and restarts the app (stop and redeploy the previous image
   version first if the new code itself is the problem). This is destructive — it asks for
   confirmation before replacing anything.

## Local development (without Docker for the app)

```bash
docker compose up -d db      # just Postgres
npm install
npm run db:migrate           # applies migrations, prompts for a name on schema changes
npm run db:seed
npm run dev
```

# Features
Below is a set of highlighted features and what to know about them.


## Currency

Purchase prices can be entered in whatever currency an item was actually bought in.
`DEFAULT_CURRENCY` (see [Environment variables](#environment-variables)) sets the currency
everything gets converted to for display — conversion uses live rates from the free
frankfurter.app API, cached for 12 hours, and degrades gracefully (shows the original amount only)
if the deployment has no outbound internet access.

## Data import / export

Settings → Import / export (requires the `settings:manage` permission) can back up or bulk-edit
locations, asset types, assets, and kits — not people, roles, or checkout history — in JSON, a
CSV zip (one file per entity), or Excel (.xlsx, one sheet per entity). Matches existing records by
name/asset tag, so re-importing the same file is safe and idempotent. Download the example file in
any format from the same page to see the exact structure expected.

## Notable commands

- `npm run build` / `npm run dev` / `npm run start`
- `npm run db:migrate` — create + apply a migration from schema changes (interactive)
- `npm run db:deploy` — apply existing migrations non-interactively (what Docker uses)
- `npm run db:seed` — seed default roles + the "Generic" built-in asset type (Cable/Vehicle/Battery
  are opt-in starter templates now — see Asset Types → Import template)
- `npm run backup` / `scripts/restore.sh backups/<timestamp>` — see "Upgrading an existing
  instance" above

## Known simplifications

- No depreciation/maintenance scheduling — only purchase info + warranty-expiry alerts.
- Attachments are stored on local disk (the `uploads` volume) by default; set `STORAGE_DRIVER=s3`
  to use S3-compatible object storage instead (see [Environment variables](#environment-variables)).
