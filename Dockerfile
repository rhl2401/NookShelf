# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Slim, standalone install of just what the entrypoint needs to run migrate/
# seed at container startup (the `prisma` CLI and `tsx`) — neither is ever
# imported by the app's own request-handling code, so Next's standalone
# output tracer (see next.config.ts) never picks them up on its own. A
# separate tiny package.json (not the app's) keeps this install from also
# dragging in the app's full dependency tree.
FROM base AS cli-deps
COPY docker/cli-package.json ./package.json
RUN npm install --omit=dev --ignore-scripts
COPY prisma ./prisma
COPY prisma7.config.ts ./prisma7.config.ts
# Downloads the Prisma schema-engine binary (used by `migrate deploy`) for
# this build's target platform — --ignore-scripts above skipped @prisma/
# engines' own postinstall step, and without this the binary would otherwise
# only get fetched lazily over the network at container startup, which
# self-hosted/offline installs can't rely on.
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npx prisma generate

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# A placeholder DATABASE_URL is enough for `prisma generate`/build — no DB
# connection is actually made until the app runs.
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

# Next's self-contained server — only the node_modules it actually traced as
# reachable at runtime, not a full install (see output: "standalone" in
# next.config.ts). Static assets and public/ are excluded from that trace on
# purpose (they're served directly, not imported), so they're copied in too.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# The entrypoint's migrate/seed step runs outside Next's request-handling
# code entirely, so none of this is reachable by the trace above — merged
# into the same node_modules the standalone server already has, so the
# existing bare `npx prisma`/`npx tsx` calls below keep resolving normally.
COPY --from=cli-deps /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma7.config.ts ./prisma7.config.ts
# seed.ts is run directly by tsx, not bundled through Next — it needs its
# imports present as real files on disk rather than traced into .next/server.
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/src/lib/permissions.ts ./src/lib/permissions.ts

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]

# ---------------------------------------------------------------------------
# Dev stage — hot-reloading `next dev`, source bind-mounted via
# docker-compose.override.yml. Never used unless a compose file explicitly
# targets it. NODE_ENV=development here is what allows AUTH_DEV_LOGIN to
# actually take effect (see src/lib/dev-login.ts).
# ---------------------------------------------------------------------------
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]
