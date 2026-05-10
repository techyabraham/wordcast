import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppEnv } from '@wordcast/config';
import { Queue } from 'bullmq';
import { queueNames } from './queue-names';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    maxRetriesPerRequest: null;
    enableReadyCheck: false;
  };
  private readonly mediaQueue: Queue;
  private readonly mediaIngestionQueue: Queue;
  private readonly aiQueue: Queue;
  private readonly searchQueue: Queue;

  constructor(configService: ConfigService<AppEnv>) {
    const redisUrl = new URL(configService.getOrThrow('REDIS_URL'));

    this.connection = {
      host: redisUrl.hostname,
      port: Number(redisUrl.port || 6379),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      ...(redisUrl.username ? { username: decodeURIComponent(redisUrl.username) } : {}),
      ...(redisUrl.password ? { password: decodeURIComponent(redisUrl.password) } : {}),
    };

    this.mediaQueue = new Queue(queueNames.media, { connection: this.connection });
    this.mediaIngestionQueue = new Queue(queueNames.mediaIngestion, { connection: this.connection });
    this.aiQueue = new Queue(queueNames.ai, { connection: this.connection });
    this.searchQueue = new Queue(queueNames.search, { connection: this.connection });
  }

  async enqueueMediaProcessing(payload: Record<string, unknown>) {
    const uploadJobId = payload.uploadJobId;
    return this.mediaQueue.add('media.validate-and-transcode', payload, {
      attempts: 5,
      removeOnComplete: 500,
      removeOnFail: 1000,
      backoff: { type: 'exponential', delay: 3000 },
      ...(typeof uploadJobId === 'string' ? { jobId: uploadJobId } : {}),
    });
  }

  async enqueueAiProcessing(payload: Record<string, unknown>) {
    return this.aiQueue.add('ai.transcribe-and-generate-metadata', payload, {
      attempts: 5,
      removeOnComplete: 500,
      removeOnFail: 1000,
      backoff: { type: 'exponential', delay: 3000 },
    });
  }

  async enqueueMediaIngestion(payload: Record<string, unknown>) {
    const uploadJobId = payload.uploadJobId;
    return this.mediaIngestionQueue.add('media.import-social-sermon', payload, {
      attempts: 5,
      removeOnComplete: 500,
      removeOnFail: 1000,
      backoff: { type: 'exponential', delay: 5000 },
      ...(typeof uploadJobId === 'string' ? { jobId: uploadJobId } : {}),
    });
  }

  async enqueueSearchSync(payload: Record<string, unknown>) {
    return this.searchQueue.add('search.index-entity', payload, {
      attempts: 5,
      removeOnComplete: 500,
      removeOnFail: 1000,
      backoff: { type: 'exponential', delay: 3000 },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.mediaQueue.close(),
      this.mediaIngestionQueue.close(),
      this.aiQueue.close(),
      this.searchQueue.close(),
    ]);
  }
}
