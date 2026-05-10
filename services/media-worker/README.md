# Wordcast Media Worker

BullMQ worker for media ingestion stages:

- Quarantine
- Validation
- Transcoding scaffold
- Processed media asset persistence
- AI queue handoff

Run:

```bash
pnpm --filter @wordcast/media-worker dev
```

## Docker

Build:

```bash
docker build -f infrastructure/docker/Dockerfile.media-worker -t wordcast-media-worker .
```

Run (example):

```bash
docker run --rm -e DATABASE_URL=postgresql://wordcast:wordcast@localhost:5432/wordcast?schema=public -e REDIS_URL=redis://localhost:6379 wordcast-media-worker
```
