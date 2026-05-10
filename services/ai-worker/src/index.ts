import { Queue, Worker } from 'bullmq';
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { createReadStream, existsSync } from 'fs';

const redisUrl = process.env.REDIS_URL;
const databaseUrl = process.env.DATABASE_URL;
const openAiKey = process.env.OPENAI_API_KEY;

if (!redisUrl || !databaseUrl || !openAiKey) {
  throw new Error('REDIS_URL, DATABASE_URL, and OPENAI_API_KEY are required');
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
const openai = new OpenAI({ apiKey: openAiKey });
const searchQueue = new Queue('search-indexing', { connection });

const buildMetadataPrompt = (title: string, transcript: string): string => {
  return [
    'You are assisting a Christian sermon platform focused on Nigerian listeners.',
    'Generate JSON only with keys: description, summary, tags, scriptureReferences, topics, confidenceScore.',
    'topics should be an array of short topic names.',
    'confidenceScore should be between 0 and 1.',
    `Sermon title: ${title}`,
    `Transcript excerpt: ${transcript.slice(0, 6000)}`,
  ].join('\n');
};

const requestWhisperTranscription = async (sermonId: string): Promise<string | null> => {
  const sourceAsset = await prisma.mediaAsset.findFirst({
    where: {
      sermonId,
      type: 'PROCESSED_AUDIO',
      status: {
        in: ['PROCESSED', 'PUBLISHED'],
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const localFilePath =
    sourceAsset?.metadata && typeof sourceAsset.metadata === 'object' && 'localFilePath' in sourceAsset.metadata
      ? String((sourceAsset.metadata as Record<string, unknown>).localFilePath)
      : null;

  if (!localFilePath || !existsSync(localFilePath)) {
    return null;
  }

  const transcription = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file: createReadStream(localFilePath),
    response_format: 'text',
  });

  return transcription;
};

const worker = new Worker(
  'ai-processing',
  async (job) => {
    const uploadJobId = String(job.data.uploadJobId);
    const sermonId = String(job.data.sermonId);

    if (!sermonId || sermonId === 'undefined') {
      throw new Error('sermonId is required for AI processing');
    }

    const sermon = await prisma.sermon.findUnique({ where: { id: sermonId } });
    if (!sermon) {
      throw new Error('Sermon not found');
    }

    const whisperTranscript = await requestWhisperTranscription(sermonId).catch(() => null);
    const transcript =
      whisperTranscript ??
      sermon.transcript ??
      `Auto-transcribed placeholder for sermon titled "${sermon.title}". Replace with real Whisper integration.`;

    const completion = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: buildMetadataPrompt(sermon.title, transcript),
      text: {
        format: {
          type: 'json_schema',
          name: 'sermon_ai_metadata',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              description: { type: 'string' },
              summary: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              scriptureReferences: { type: 'array', items: { type: 'string' } },
              topics: { type: 'array', items: { type: 'string' } },
              confidenceScore: { type: 'number' },
            },
            required: [
              'description',
              'summary',
              'tags',
              'scriptureReferences',
              'topics',
              'confidenceScore',
            ],
          },
        },
      },
    });

    const jsonPayload = completion.output_text || '{}';
    const parsed = JSON.parse(jsonPayload) as {
      description: string;
      summary: string;
      tags: string[];
      scriptureReferences: string[];
      topics: string[];
      confidenceScore: number;
    };

    const aiMetadata = await prisma.sermonAIMetadata.create({
      data: {
        sermonId,
        uploadJobId,
        transcript,
        generatedDescription: parsed.description,
        summary: parsed.summary,
        generatedTags: parsed.tags,
        scriptureReferences: parsed.scriptureReferences,
        detectedTopics: parsed.topics,
        confidenceScore: parsed.confidenceScore,
        status: 'GENERATED',
      },
    });

    for (const topicName of parsed.topics) {
      const normalized = topicName.toLowerCase().trim();
      const matchedTopic = await prisma.topic.findFirst({
        where: {
          OR: [
            { name: { equals: topicName, mode: 'insensitive' } },
            { aliases: { some: { normalized } } },
          ],
        },
      });

      await prisma.topicSuggestion.create({
        data: {
          sermonId,
          sourceAiMetadataId: aiMetadata.id,
          proposedName: topicName,
          normalizedName: normalized,
          confidenceScore: parsed.confidenceScore,
          matchedTopicId: matchedTopic?.id ?? null,
          status: 'PENDING',
        },
      });
    }

    await prisma.uploadJob.updateMany({
      where: { id: uploadJobId },
      data: {
        status: 'INDEXING',
      },
    });

    await prisma.sermon.update({
      where: { id: sermonId },
      data: {
        status: 'REVIEW_PENDING',
      },
    });

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
  },
  {
    connection,
    concurrency: 2,
  },
);

worker.on('completed', (job) => {
  console.info(`[ai-worker] completed job ${job.id}`);
});

worker.on('failed', async (job, error) => {
  console.error(`[ai-worker] failed job ${job?.id ?? 'unknown'}: ${error.message}`);

  const uploadJobId = job?.data?.uploadJobId as string | undefined;
  if (uploadJobId) {
    await prisma.uploadJob.updateMany({
      where: { id: uploadJobId },
      data: {
        status: 'FAILED',
        errorMessage: error.message,
      },
    });
  }
});

process.on('SIGINT', async () => {
  await worker.close();
  await searchQueue.close();
  await prisma.$disconnect();
  process.exit(0);
});

console.info('[ai-worker] running');
