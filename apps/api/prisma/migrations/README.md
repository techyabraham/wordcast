# Prisma migrations

Generate and apply migrations from the current schema:

```bash
pnpm --filter @wordcast/api prisma:migrate
```

The initial migration should be generated as `apps/api/prisma/migrations/<timestamp>_init/`.
