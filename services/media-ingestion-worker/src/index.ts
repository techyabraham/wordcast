import { Queue, Worker } from 'bullmq';
import { type Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import os from 'os';
import path from 'path';
import { statSync } from 'fs';
import { detectPlatform } from './modules/platform-detector';
import { fetchMetadata } from './modules/metadata-extractor';
import { downloadVideo } from './modules/yt-dlp-downloader';
import { extractAudio } from './modules/ffmpeg-processor';
import { R2Uploader } from './modules/r2-uploader';
import { WhisperTranscriber } from './modules/whisper-transcriber';
import { cleanupFiles } from './modules/cleanup-manager';

const redisUrl = process.env.REDIS_URL;
const databaseUrl = process.env.DATABASE_URL;
const openAiKey = process.env.OPENAI_API_KEY;
const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKey = process.env.R2_ACCESS_KEY;
const r2SecretKey = process.env.R2_SECRET_KEY;
const r2Bucket = process.env.R2_BUCKET;
const r2PublicUrl = process.env.R2_PUBLIC_URL;

if (!redisUrl || !databaseUrl) {
  throw new Error('REDIS_URL and DATABASE_URL are required');
}
if (!openAiKey) {
  throw new Error('OPENAI_API_KEY is required');
}
if (!r2AccountId || !r2AccessKey || !r2SecretKey || !r2Bucket || !r2PublicUrl) {
  throw new Error('R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET, and R2_PUBLIC_URL are required');
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
const r2Uploader = new R2Uploader({
  accountId: r2AccountId,
  accessKeyId: r2AccessKey,
  secretAccessKey: r2SecretKey,
  bucket: r2Bucket,
  publicUrl: r2PublicUrl,
});
const whisper = new WhisperTranscriber(openAiKey);
const searchQueue = new Queue('search-indexing', { connection });

const logStep = (jobId: string, step: string, status: 'success' | 'failed', startedAt: number) => {
  const durationMs = Date.now() - startedAt;
  console.info(
    JSON.stringify({
      jobId,
      step,
      status,
      durationMs,
      timestamp: new Date().toISOString(),
    }),
  );
};

const updateJobStatus = async (uploadJobId: string, status: string, errorMessage?: string) => {
  await prisma.uploadJob.updateMany({
    where: { id: uploadJobId },
    data: {
      status: status as any,
      ...(errorMessage ? { errorMessage } : {}),
    },
  });
};

const worker = new Worker(
  'media-ingestion',
  async (job) => {
    if (job.name !== 'media.import-social-sermon') {
      console.warn(`[media-ingestion-worker] skipped unsupported job ${job.name}`);
      return;
    }

    const uploadJobId = String(job.data.uploadJobId ?? '');
    const sermonId = String(job.data.sermonId ?? '');
    const sourceUrl = String(job.data.sourceUrl ?? '');

    if (!uploadJobId || !sermonId || !sourceUrl) {
      throw new Error('uploadJobId, sermonId, and sourceUrl are required');
    }

    const uploadJob = await prisma.uploadJob.findUnique({ where: { id: uploadJobId } });
    if (!uploadJob) {
      throw new Error('Upload job not found');
    }

    let downloadedVideoPath: string | null = null;
    let audioPath: string | null = null;
    let currentStep: { name: string; startedAt: number } | null = null;

    const beginStep = (name: string) => {
      const startedAt = Date.now();
      currentStep = { name, startedAt };
      return startedAt;
    };

    const finishStep = (name: string, status: 'success' | 'failed', startedAt: number) => {
      logStep(uploadJobId, name, status, startedAt);
      if (status === 'success' && currentStep?.name === name) {
        currentStep = null;
      }
    };

    const detectStarted = beginStep('detect_platform');
    const platform = detectPlatform(sourceUrl);
    if (!platform) {
      finishStep('detect_platform', 'failed', detectStarted);
      throw new Error('Unsupported social media URL');
    }
    finishStep('detect_platform', 'success', detectStarted);

    try {
      const metadataStarted = beginStep('extract_metadata');
      await job.updateProgress({ step: 'metadata', status: 'started' });
      const metadata = await fetchMetadata(sourceUrl);
      finishStep('extract_metadata', 'success', metadataStarted);
      await job.updateProgress({ step: 'metadata', status: 'success' });

      await prisma.uploadJob.update({
        where: { id: uploadJobId },
        data: {
          status: 'DOWNLOADING' as any,
          ...(metadata.platformVideoId || uploadJob.externalRef
            ? { externalRef: metadata.platformVideoId ?? uploadJob.externalRef ?? null }
            : {}),
          metadata: {
            ...(uploadJob.metadata && typeof uploadJob.metadata === 'object' ? uploadJob.metadata : {}),
            platform,
            sourceUrl,
            ...(metadata.title ? { title: metadata.title } : {}),
            ...(metadata.uploader ? { uploader: metadata.uploader } : {}),
            ...(metadata.thumbnail ? { thumbnail: metadata.thumbnail } : {}),
            ...(metadata.durationSeconds !== undefined
              ? { durationSeconds: metadata.durationSeconds }
              : {}),
            ...(metadata.uploadDate ? { uploadDate: metadata.uploadDate } : {}),
            ...(metadata.platformVideoId ? { platformVideoId: metadata.platformVideoId } : {}),
          } as Prisma.InputJsonValue,
        },
      });

      if (metadata.title) {
        await prisma.sermon.update({
          where: { id: sermonId },
          data: {
            title: metadata.title,
          },
        });
      }

      const downloadStarted = beginStep('download_video');
      await job.updateProgress({ step: 'download', status: 'started' });
      downloadedVideoPath = await downloadVideo(sourceUrl, os.tmpdir(), uploadJobId);
      finishStep('download_video', 'success', downloadStarted);
      await job.updateProgress({ step: 'download', status: 'success' });

      await updateJobStatus(uploadJobId, 'PROCESSING_AUDIO');

      const audioStarted = beginStep('process_audio');
      await job.updateProgress({ step: 'audio', status: 'started' });
      audioPath = path.join(os.tmpdir(), `wordcast-${uploadJobId}-${randomUUID()}.mp3`);
      await extractAudio(downloadedVideoPath, audioPath);
      finishStep('process_audio', 'success', audioStarted);
      await job.updateProgress({ step: 'audio', status: 'success' });

      await updateJobStatus(uploadJobId, 'UPLOADING');

      const uploadStarted = beginStep('upload_audio');
      await job.updateProgress({ step: 'upload', status: 'started' });
      const objectKey = `audio/${sermonId}/${randomUUID()}.mp3`;
      const uploadResult = await r2Uploader.uploadAudio({
        filePath: audioPath,
        key: objectKey,
        contentType: 'audio/mpeg',
      });
      const audioStats = statSync(audioPath);
      finishStep('upload_audio', 'success', uploadStarted);
      await job.updateProgress({ step: 'upload', status: 'success' });

      const normalizedDurationSeconds =
        metadata.durationSeconds !== undefined ? Math.round(metadata.durationSeconds) : undefined;

      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          sermonId,
          uploadJobId,
          type: 'PROCESSED_AUDIO',
          status: 'PUBLISHED',
          storageProvider: 'r2',
          bucket: r2Bucket,
          objectKey,
          cdnUrl: uploadResult.url,
          mimeType: 'audio/mpeg',
          sizeBytes: BigInt(audioStats.size),
          durationSeconds: normalizedDurationSeconds ?? null,
          metadata: {
            platform,
            sourceUrl,
            ...(metadata.title ? { title: metadata.title } : {}),
            ...(metadata.uploader ? { uploader: metadata.uploader } : {}),
            ...(metadata.thumbnail ? { thumbnail: metadata.thumbnail } : {}),
            ...(normalizedDurationSeconds !== undefined
              ? { durationSeconds: normalizedDurationSeconds }
              : {}),
            ...(metadata.uploadDate ? { uploadDate: metadata.uploadDate } : {}),
            ...(metadata.platformVideoId ? { platformVideoId: metadata.platformVideoId } : {}),
          } as Prisma.InputJsonValue,
        },
      });

      await updateJobStatus(uploadJobId, 'TRANSCRIBING');

      const transcriptionStarted = beginStep('transcribe_audio');
      await job.updateProgress({ step: 'transcription', status: 'started' });
      const transcription = await whisper.transcribe(audioPath);
      finishStep('transcribe_audio', 'success', transcriptionStarted);
      await job.updateProgress({ step: 'transcription', status: 'success' });

      const transcriptDurationSeconds =
        transcription.durationSeconds !== undefined
          ? Math.round(transcription.durationSeconds)
          : normalizedDurationSeconds ?? null;

      const transcriptStoreStarted = beginStep('store_transcript');
      await prisma.transcript.create({
        data: {
          sermonId,
          language: transcription.language ?? 'en',
          durationSeconds: transcriptDurationSeconds,
          fullText: transcription.text,
          segmentsJSON: transcription.segments as unknown as Prisma.InputJsonValue,
        },
      });
      finishStep('store_transcript', 'success', transcriptStoreStarted);

      if (transcriptDurationSeconds && transcriptDurationSeconds > 0 && !normalizedDurationSeconds) {
        await prisma.mediaAsset.update({
          where: { id: mediaAsset.id },
          data: {
            durationSeconds: transcriptDurationSeconds,
            metadata: {
              ...(mediaAsset.metadata && typeof mediaAsset.metadata === 'object' ? mediaAsset.metadata : {}),
              durationSeconds: transcriptDurationSeconds,
            },
          },
        });
      }

      const durationSeconds = Math.max(
        0,
        transcriptDurationSeconds ?? 0,
      );

      const soundbiteStarted = beginStep('create_soundbite');
      await prisma.soundBite.create({
        data: {
          sermonId,
          clipAssetId: mediaAsset.id,
          title: metadata.title ?? 'Imported sermon',
          startSeconds: 0,
          endSeconds: durationSeconds,
          status: 'PUBLISHED',
        },
      });
      finishStep('create_soundbite', 'success', soundbiteStarted);

      await prisma.sermon.update({
        where: { id: sermonId },
        data: {
          transcript: transcription.text,
          status: 'REVIEW_PENDING',
          ...(durationSeconds > 0 ? { durationSeconds } : {}),
        },
      });

      const completionStarted = beginStep('mark_completed');
      await updateJobStatus(uploadJobId, 'COMPLETED');
      await prisma.uploadJob.update({
        where: { id: uploadJobId },
        data: { completedAt: new Date() },
      });
      finishStep('mark_completed', 'success', completionStarted);

      await searchQueue.add(
        'search.index-entity',
        {
          entityType: 'sermon',
          entityId: sermonId,
          action: 'upsert',
        },
        {
          attempts: 5,
          removeOnComplete: 500,
          removeOnFail: 1000,
        },
      );
    } catch (error) {
      const failedStep = currentStep as { name: string; startedAt: number } | null;
      if (failedStep) {
        finishStep(failedStep.name, 'failed', failedStep.startedAt);
      }
      const message = error instanceof Error ? error.message : 'Ingestion pipeline failed';
      await updateJobStatus(uploadJobId, 'FAILED', message);
      throw error;
    } finally {
      const cleanupStarted = beginStep('cleanup');
      await cleanupFiles([downloadedVideoPath, audioPath]);
      finishStep('cleanup', 'success', cleanupStarted);
    }
  },
  {
    connection,
    concurrency: 3,
  },
);

worker.on('completed', (job) => {
  console.info(`[media-ingestion-worker] completed job ${job.id}`);
});

worker.on('failed', async (job, error) => {
  console.error(`[media-ingestion-worker] failed job ${job?.id ?? 'unknown'}: ${error.message}`);
  const uploadJobId = job?.data?.uploadJobId as string | undefined;
  if (uploadJobId) {
    await updateJobStatus(uploadJobId, 'FAILED', error.message);
  }
});

process.on('SIGINT', async () => {
  await worker.close();
  await searchQueue.close();
  await prisma.$disconnect();
  process.exit(0);
});

console.info('[media-ingestion-worker] running');
