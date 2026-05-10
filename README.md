# Wordcast

Wordcast is a production-leaning monorepo foundation for an audio-first Christian sermon streaming platform focused initially on Nigerian listening patterns.

## Monorepo layout

```text
wordcast/
  apps/
    mobile/
    api/
    admin-dashboard/
  services/
    media-worker/
    ai-worker/
    search-worker/
  packages/
    shared-types/
    ui/
    config/
  infrastructure/
    docker/
    docs/
```

## Core stack

- API: NestJS, TypeScript, Prisma, PostgreSQL, Redis, BullMQ, Swagger
- Admin: Next.js App Router, Tailwind CSS, desktop-first
- Workers: BullMQ consumers for media, AI, and search indexing
- Search: Typesense
- Payments: Paystack webhook scaffolding
- Infra: Docker Compose local stack, AWS-oriented architecture docs

## Quick start

1. Install dependencies

```bash
pnpm install
```

2. Start local infrastructure

```bash
pnpm compose:up
```

3. Configure environment

```bash
copy apps/api/.env.example apps/api/.env
copy apps/admin-dashboard/.env.example apps/admin-dashboard/.env.local
```

4. Generate Prisma client + migrate + seed

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

5. Run apps/workers

```bash
pnpm --filter @wordcast/api dev
pnpm --filter @wordcast/admin-dashboard dev
pnpm --filter @wordcast/media-worker dev
pnpm --filter @wordcast/ai-worker dev
pnpm --filter @wordcast/search-worker dev
```

## Seed credentials

- `admin@wordcast.dev` / `ChangeMe123!`
- `staff@wordcast.dev` / `ChangeMe123!`
- `listener@wordcast.dev` / `ChangeMe123!`

## Security defaults included

- JWT access tokens + refresh rotation with hashed session tokens
- RBAC tables (`roles`, `permissions`, `role_permissions`, `user_roles`)
- Argon2 password hashing
- DTO validation with whitelist and non-whitelisted rejection
- Helmet, CORS allowlist, throttling guard
- Audit logs for privileged actions

## Documentation

- Platform architecture: `infrastructure/docs/architecture.md`
- API docs (runtime): `http://localhost:4000/api/docs`
- App-specific readmes:
  - `apps/api/README.md`
  - `apps/admin-dashboard/README.md`
  - `services/media-worker/README.md`
  - `services/ai-worker/README.md`
  - `services/search-worker/README.md`
