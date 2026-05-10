# Wordcast API

NestJS API for public and admin surfaces under `/api/v1`.

## Features in this foundation

- Auth + sessions: register/login/refresh/logout
- RBAC with normalized role/permission tables
- Public APIs for sermons, preachers, programs, sessions, topics, sound bites, search, playlists, library, subscriptions
- Admin APIs for sermons, uploads, AI review, users, audit logs, dashboard metrics
- Prisma schema for core + future-ready entities (ministry/livestream)
- BullMQ queue producer integration
- Swagger setup and global security middleware

## Run

```bash
pnpm --filter @wordcast/api dev
```

## Env

Copy `.env.example` to `.env` and fill secrets.

## Database

```bash
pnpm --filter @wordcast/api prisma:generate
pnpm --filter @wordcast/api prisma:migrate
pnpm --filter @wordcast/api prisma:seed
```

## Test

```bash
pnpm --filter @wordcast/api test
pnpm --filter @wordcast/api test:e2e
```
