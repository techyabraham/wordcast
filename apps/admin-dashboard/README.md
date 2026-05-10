# Wordcast Admin Dashboard

Next.js App Router dashboard for staff/admin operations.

## Included pages

- Login
- Dashboard metrics
- Sermons + sermon detail/edit
- Programs
- Sessions
- Preachers
- Topics
- Upload Jobs
- AI Review
- Users
- Audit Logs

## Security approach

- Login uses server route handler proxy to backend admin auth
- Access/refresh tokens are stored in HttpOnly cookies
- Middleware protects dashboard routes

## Run

```bash
pnpm --filter @wordcast/admin-dashboard dev
```

## E2E

```bash
pnpm --filter @wordcast/admin-dashboard test
```
