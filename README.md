# Asset Management

Self-hosted asset tracking for home and small-team use — locations, asset types with custom
fields (cables included), kits, checkout/return, QR labeling, and notifications. See
`AGENTS.md`/the requirements doc for the full feature list.

## Stack

TypeScript, Next.js (App Router), PostgreSQL via Prisma 7 (`@prisma/adapter-pg`), Auth.js v5
(OAuth-only — Google, Microsoft, or any generic OIDC provider), Tailwind + shadcn/ui (Base UI).

## Running with Docker (recommended)

1. Copy `.env.example` to `.env` and fill in at least `AUTH_SECRET` (generate one with
   `openssl rand -base64 32`) and one OAuth provider's credentials.
2. `docker compose up -d --build`
3. Open http://localhost:3000 — the first person to sign in becomes Admin automatically.

The `app` container runs `prisma migrate deploy` and seeds default roles/asset types on every
start (both are idempotent), then starts the server. Uploaded files persist in the `uploads`
Docker volume; the database persists in `db_data`.

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

## Configuring OAuth

Set whichever of these you use in `.env` (leave the others blank — the login page only shows
providers with credentials configured):

- **Google** — `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- **Microsoft (Entra ID)** — `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`,
  `AUTH_MICROSOFT_ENTRA_ID_ISSUER`
- **Any other OIDC provider** — `AUTH_GENERIC_OIDC_ID`, `AUTH_GENERIC_OIDC_SECRET`,
  `AUTH_GENERIC_OIDC_ISSUER`, `AUTH_GENERIC_OIDC_NAME`

Redirect URI for all providers: `<NEXTAUTH_URL>/api/auth/callback/<provider>` (e.g.
`http://localhost:3000/api/auth/callback/google`).

## Currency

Purchase prices can be entered in whatever currency an item was actually bought in. Set
`DEFAULT_CURRENCY` (defaults to `EUR`) to the currency everything gets converted to for display —
conversion uses live rates from the free frankfurter.app API, cached for 12 hours, and degrades
gracefully (shows the original amount only) if the deployment has no outbound internet access.

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

## Known simplifications (v1)

- OAuth provider config is env-var based, not DB/admin-editable.
- No depreciation/maintenance scheduling — only purchase info + warranty-expiry alerts.
- Person merges are audit-logged but not one-click reversible.
- Attachments are stored on local disk (the `uploads` volume), not object storage.
