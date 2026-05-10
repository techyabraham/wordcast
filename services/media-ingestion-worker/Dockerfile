# syntax=docker/dockerfile:1

# ── Base: Node 20 Alpine + yt-dlp + ffmpeg ───────────────────────────────────
# This worker downloads social media video, extracts audio, and transcribes it.
# yt-dlp requires Python 3; ffmpeg handles audio extraction.
FROM node:20-alpine AS base
RUN apk add --no-cache python3 py3-pip ffmpeg && \
    pip3 install --break-system-packages yt-dlp && \
    corepack enable && corepack prepare pnpm@10.5.2 --activate

# ── Workspace: install deps ───────────────────────────────────────────────────
FROM base AS workspace
WORKDIR /workspace

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY apps/api/prisma ./apps/api/prisma
COPY services/media-ingestion-worker/ ./services/media-ingestion-worker/

RUN pnpm install --frozen-lockfile

# ── Builder: generate Prisma client + compile TypeScript ─────────────────────
FROM workspace AS builder
WORKDIR /workspace

RUN pnpm --filter @wordcast/media-ingestion-worker exec prisma generate \
      --schema ./apps/api/prisma/schema.prisma

RUN pnpm --filter @wordcast/media-ingestion-worker build

RUN pnpm deploy --filter @wordcast/media-ingestion-worker --prod /deploy

# ── Runner: keep yt-dlp + ffmpeg in the final image ──────────────────────────
FROM base AS runner
WORKDIR /app

COPY --from=builder /deploy/node_modules ./node_modules
COPY --from=builder /deploy/package.json ./package.json
COPY --from=builder /workspace/services/media-ingestion-worker/dist ./dist
COPY --from=builder /workspace/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
