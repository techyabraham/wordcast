# Wordcast Media Ingestion Worker

Background worker for social-media sermon imports. This service runs the download, audio extraction, R2 upload, and Whisper transcription pipeline for UploadJobs of type IMPORT_SOCIAL_SERMON.

## Requirements

- ffmpeg available on PATH
- yt-dlp available on PATH
- Redis + Postgres reachable

## Environment

- DATABASE_URL
- REDIS_URL
- OPENAI_API_KEY
- R2_ACCOUNT_ID
- R2_ACCESS_KEY
- R2_SECRET_KEY
- R2_BUCKET
- R2_PUBLIC_URL

## Run

```bash
pnpm --filter @wordcast/media-ingestion-worker dev
```

## Docker

```bash
docker build -f infrastructure/docker/Dockerfile.media-ingestion-worker -t wordcast-media-ingestion-worker .
```

```bash
docker run --rm -e DATABASE_URL=postgresql://wordcast:wordcast@localhost:5432/wordcast?schema=public -e REDIS_URL=redis://localhost:6379 -e OPENAI_API_KEY=sk-replace-me -e R2_ACCOUNT_ID=account -e R2_ACCESS_KEY=access -e R2_SECRET_KEY=secret -e R2_BUCKET=wordcast -e R2_PUBLIC_URL=https://cdn.wordcast.app wordcast-media-ingestion-worker
```
