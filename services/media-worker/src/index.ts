import { Queue, Worker } from 'bullmq';
import { PrismaClient, UploadJobStatus } from '@prisma/client';

const redisUrl = process.env.REDIS_URL;
const databaseUrl = process.env.DATABASE_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL is required');
}
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const redis = new URL(redisUrl);
const connection = {
  host: redis.hostname,
  port: Number(redis.port || 6379),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...(redis.username ? { username: decodeURIComponent(redis.username) } : {}),
  ...(redis.password ? { password: decodeURIComponent(redis.password) } : {}),
};

const prisma = new PrismaClient();
const aiQueue = new Queue('ai-processing', { connection });

const worker = new Worker(
  'media-processing',
  async (job) => {
    const uploadJobId = String(job.data.uploadJobId);
    const sermonId = job.data.sermonId ? String(job.data.sermonId) : null;

    if (!uploadJobId) {
      throw new Error('uploadJobId is required');
    }

    await prisma.uploadJob.update({
      where: { id: uploadJobId },
      data: {
        status: UploadJobStatus.QUARANTINE,
      },
    });

    // Validation stage (MIME, duration checks, malware scanning hook point).
    await prisma.uploadJob.update({
      where: { id: uploadJobId },
      data: {
        status: UploadJobStatus.VALIDATING,
      },
    });

    // Transcoding stage (replace with ffmpeg pipeline in production worker image).
    await prisma.uploadJob.update({
      where: { id: uploadJobId },
      data: {
        status: UploadJobStatus.TRANSCODING,
      },
    });

    if (sermonId) {
      const processedObjectKey = `sermons/${sermonId}/audio/processed.mp3`;
      await prisma.mediaAsset.create({
        data: {
          sermonId,
          uploadJobId,
          type: 'PROCESSED_AUDIO',
          status: 'PROCESSED',
          objectKey: processedObjectKey,
          cdnUrl: `https://cdn.wordcast.example/${processedObjectKey}`,
          durationSeconds: 3600,
          metadata: {
            codec: 'mp3',
            bitrate: '128k',
            normalizedLufs: -16,
          },
        },
      });

      await prisma.sermon.update({
        where: { id: sermonId },
        data: {
          durationSeconds: 3600,
          status: 'PROCESSING',
        },
      });
    }

    await prisma.uploadJob.update({
      where: { id: uploadJobId },
      data: {
        status: UploadJobStatus.AI_PROCESSING,
      },
    });

    await aiQueue.add(
      'ai.transcribe-and-generate-metadata',
      {
        uploadJobId,
        sermonId,
      },
      {
        attempts: 5,
        removeOnComplete: 500,
        removeOnFail: 1000,
      },
    );
  },
  {
    connection,
    concurrency: 4,
  },
);

worker.on('completed', (job) => {
  console.info(`[media-worker] completed job ${job.id}`);
});

worker.on('failed', async (job, error) => {
  console.error(`[media-worker] failed job ${job?.id ?? 'unknown'}: ${error.message}`);
  const uploadJobId = job?.data?.uploadJobId as string | undefined;
  if (uploadJobId) {
    await prisma.uploadJob.updateMany({
      where: { id: uploadJobId },
      data: {
        status: UploadJobStatus.FAILED,
        errorMessage: error.message,
      },
    });
  }
});

process.on('SIGINT', async () => {
  await worker.close();
  await aiQueue.close();
  await prisma.$disconnect();
  process.exit(0);
});

console.info('[media-worker] running');
