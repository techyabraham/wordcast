# syntax=docker/dockerfile:1

# ── Base: Node 20 Alpine with pnpm ──────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.5.2 --activate

# ── Workspace: install all deps ──────────────────────────────────────────────
FROM base AS workspace
WORKDIR /workspace

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./

# Dashboard depends on @wordcast/ui
COPY packages/ ./packages/
COPY apps/admin-dashboard/ ./apps/admin-dashboard/

RUN pnpm install --frozen-lockfile

# ── Builder: compile ─────────────────────────────────────────────────────────
FROM workspace AS builder
WORKDIR /workspace

# next build picks up transpilePackages and output: 'standalone' from next.config.mjs
RUN pnpm --filter @wordcast/admin-dashboard build

# ── Runner: standalone Next.js bundle ────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Tell Next.js where the API lives at runtime (overridable via compose env)
ENV API_BASE_URL=http://api:4000/api/v1

# next build --output standalone produces a self-contained server at .next/standalone
COPY --from=builder /workspace/apps/admin-dashboard/.next/standalone ./
COPY --from=builder /workspace/apps/admin-dashboard/.next/static ./.next/static

# Copy public assets if directory exists (handled gracefully)
COPY --from=builder /workspace/apps/admin-dashboard/public* ./public/

EXPOSE 3000

CMD ["node", "server.js"]
