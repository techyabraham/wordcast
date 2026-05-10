# Wordcast Search Worker

BullMQ worker for Typesense indexing:

- Sermons
- Preachers
- Programs
- Topics

Worker ensures collections exist and upserts documents by queue event.

Run:

```bash
pnpm --filter @wordcast/search-worker dev
```
