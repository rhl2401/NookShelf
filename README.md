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
- `npm run db:seed` — seed default roles + built-in asset types (Cable, Generic)

## Known simplifications (v1)

- OAuth provider config is env-var based, not DB/admin-editable.
- No depreciation/maintenance scheduling — only purchase info + warranty-expiry alerts.
- Person merges are audit-logged but not one-click reversible.
- Attachments are stored on local disk (the `uploads` volume), not object storage.
