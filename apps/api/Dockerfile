# syntax=docker/dockerfile:1

# ── Base: Node 20 Alpine with pnpm ──────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.5.2 --activate

# ── Workspace: install all deps ──────────────────────────────────────────────
FROM base AS workspace
WORKDIR /workspace

# Lockfile + workspace manifest first (maximises layer cache)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./

# Only the packages and app this service needs
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm install --frozen-lockfile

# ── Builder: compile packages then the API ───────────────────────────────────
FROM workspace AS builder
WORKDIR /workspace

# Build the shared config package first (main: dist/index.js)
RUN pnpm --filter @wordcast/config build

# Generate Prisma client
RUN pnpm --filter @wordcast/api exec prisma generate --schema ./apps/api/prisma/schema.prisma

# Compile NestJS API (outputs to apps/api/dist/)
RUN pnpm --filter @wordcast/api build

# Produce a clean production-only dependency tree
RUN pnpm deploy --filter @wordcast/api --prod /deploy

# ── Runner: minimal production image ─────────────────────────────────────────
FROM base AS runner
WORKDIR /app

# Production node_modules from pnpm deploy
COPY --from=builder /deploy/node_modules ./node_modules
COPY --from=builder /deploy/package.json ./package.json

# Compiled application
COPY --from=builder /workspace/apps/api/dist ./dist

# Prisma schema + migrations (needed for migrate deploy at startup)
COPY --from=builder /workspace/apps/api/prisma ./prisma

# Generated Prisma client (lives in .prisma, referenced by @prisma/client)
COPY --from=builder /workspace/node_modules/.prisma ./node_modules/.prisma

# @wordcast/config compiled output — declared via TS path alias, not package.json,
# so pnpm deploy won't include it; add it manually.
COPY --from=builder /workspace/packages/config/dist ./node_modules/@wordcast/config/dist
COPY --from=builder /workspace/packages/config/package.json ./node_modules/@wordcast/config/package.json

# Startup script runs prisma migrate deploy then starts the server
COPY apps/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV NODE_ENV=production
EXPOSE 4000

ENTRYPOINT ["./entrypoint.sh"]
