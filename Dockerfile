# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Separate, production-only install for the runner stage — keeps devDependencies
# (typescript, eslint, tailwindcss, and everything they pull in, e.g. axe-core,
# elkjs) out of the shipped image entirely, instead of copying builder's
# dev-inclusive node_modules forward.
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY prisma ./prisma
COPY prisma7.config.ts ./prisma7.config.ts
# Downloads the Prisma query engine binary into this node_modules copy —
# --ignore-scripts above skipped @prisma/engines' own postinstall step, and
# without this the engine binary is missing at container startup.
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

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma7.config.ts ./prisma7.config.ts
COPY --from=builder /app/src ./src
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && chown -R nextjs:nodejs /app/.next

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]

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
