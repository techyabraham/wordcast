# syntax=docker/dockerfile:1

# ── Base ─────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.5.2 --activate

# ── Workspace: install deps ───────────────────────────────────────────────────
FROM base AS workspace
WORKDIR /workspace

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY apps/api/prisma ./apps/api/prisma
COPY services/search-worker/ ./services/search-worker/

RUN pnpm install --frozen-lockfile

# ── Builder: generate Prisma client + compile TypeScript ─────────────────────
FROM workspace AS builder
WORKDIR /workspace

RUN pnpm --filter @wordcast/search-worker exec prisma generate \
      --schema ./apps/api/prisma/schema.prisma

RUN pnpm --filter @wordcast/search-worker build

RUN pnpm deploy --filter @wordcast/search-worker --prod /deploy

# ── Runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

COPY --from=builder /deploy/node_modules ./node_modules
COPY --from=builder /deploy/package.json ./package.json
COPY --from=builder /workspace/services/search-worker/dist ./dist
COPY --from=builder /workspace/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
