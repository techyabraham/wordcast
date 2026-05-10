# Wordcast Platform Architecture

## Runtime topology (AWS-oriented)

- API services: ECS Fargate (stateless NestJS instances)
- Admin dashboard: Next.js deployment on ECS or Vercel with private staff access
- Object storage: S3 buckets (`raw`, `processed`, `hls`, `clips`) with lifecycle policies
- CDN: CloudFront in front of S3 for media delivery
- Database: Amazon RDS PostgreSQL (multi-AZ in production)
- Cache + queue backend: ElastiCache Redis
- Workers: ECS Fargate services for media, AI, and search queue consumers
- Search: Typesense cluster (self-hosted on EC2/ECS or managed)
- Secrets: AWS Secrets Manager + Parameter Store
- Observability: CloudWatch logs, metrics, and alarms

## Security baseline

- JWT access + rotating refresh sessions with hashed refresh tokens in DB
- RBAC permissions checked with guards on every admin write path
- Argon2 password hashing
- Helmet + CORS allowlist + throttling + strict DTO validation
- Sensitive actions captured in `AuditLog`
- Paystack webhook signature validation scaffold
- No app-server media file serving; media is modeled for object-store/CDN delivery

## Media pipeline

1. Staff creates upload via `/admin/uploads/*`
2. API creates `UploadJob`, `Sermon` (processing state), and enqueue media queue job
3. `media-worker` transitions job: quarantine -> validation -> transcoding
4. Processed `MediaAsset` records created and AI queue job emitted
5. `ai-worker` generates transcript + metadata suggestions into `SermonAIMetadata`
6. Staff review flow approves/rejects AI output before sermon publish
7. `search-worker` syncs searchable entities into Typesense

## Future livestream readiness

`Livestream` and `Ministry` entities are already modeled for archive linking and future live ingestion workflows.
