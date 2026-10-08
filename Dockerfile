# syntax=docker/dockerfile:1
# One image serves the REST API and the built web app from the same origin.

FROM node:22-alpine AS base
# OpenSSL is needed by Prisma's schema engine (used for `migrate deploy`).
RUN apk add --no-cache openssl && corepack enable && corepack prepare pnpm@10.34.6 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# The repo uses a hoisted node_modules for React Native; the server image does not need that, and
# the isolated linker makes `--filter` install only the selected workspaces' dependencies.
RUN echo "node-linker=isolated" > .npmrc
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma apps/api/prisma
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
# Placeholder so `prisma generate` (postinstall) can load prisma.config.ts; never used to connect.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

# --- Build: full dependencies for the API and web workspaces (mobile is skipped) ---
FROM base AS build
RUN pnpm install --frozen-lockfile --filter "@stride/api..." --filter "@stride/web..."
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web apps/web
RUN pnpm --filter @stride/web build && pnpm --filter @stride/api build

# --- Production dependencies only for the API ---
FROM base AS prod-deps
RUN pnpm install --frozen-lockfile --prod --filter "@stride/api..."

# --- Runtime ---
FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl
ENV NODE_ENV=production \
    PORT=8080 \
    WEB_DIST_DIR=/app/apps/web/dist
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/package.json /app/apps/api/prisma.config.ts ./apps/api/
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/web/dist ./apps/web/dist
WORKDIR /app/apps/api
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health/ready" >/dev/null || exit 1
# Apply committed migrations (never a reset or `db push`), then start the server.
# Set RUN_MIGRATIONS=false where migrations run as a separate release step (e.g. Cloud Run).
CMD ["sh", "-c", "if [ \"$RUN_MIGRATIONS\" != \"false\" ]; then ./node_modules/.bin/prisma migrate deploy; fi && exec node dist/server.js"]
