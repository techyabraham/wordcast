import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import Typesense from 'typesense';

const redisUrl = process.env.REDIS_URL;
const databaseUrl = process.env.DATABASE_URL;
const typesenseHost = process.env.TYPESENSE_HOST;
const typesensePort = Number(process.env.TYPESENSE_PORT ?? 8108);
const typesenseProtocol = (process.env.TYPESENSE_PROTOCOL ?? 'http') as 'http' | 'https';
const typesenseApiKey = process.env.TYPESENSE_API_KEY;

if (!redisUrl || !databaseUrl || !typesenseHost || !typesenseApiKey) {
  throw new Error('REDIS_URL, DATABASE_URL, TYPESENSE_HOST, TYPESENSE_API_KEY are required');
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
const typesense = new Typesense.Client({
  nodes: [{ host: typesenseHost, port: typesensePort, protocol: typesenseProtocol }],
  apiKey: typesenseApiKey,
  connectionTimeoutSeconds: 5,
});

const ensureCollections = async () => {
  const schemas = [
    {
      name: 'sermons',
      fields: [
        { name: 'id', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', optional: true },
        { name: 'preacher_name', type: 'string' },
        { name: 'program_name', type: 'string', optional: true },
        { name: 'topics', type: 'string[]', optional: true },
        { name: 'aliases', type: 'string[]', optional: true },
        { name: 'status', type: 'string' },
      ],
    },
    {
      name: 'preachers',
      fields: [
        { name: 'id', type: 'string' },
        { name: 'display_name', type: 'string' },
        { name: 'aliases', type: 'string[]', optional: true },
      ],
    },
    {
      name: 'programs',
      fields: [
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'theme', type: 'string', optional: true },
        { name: 'organizer', type: 'string', optional: true },
      ],
    },
    {
      name: 'topics',
      fields: [
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'aliases', type: 'string[]', optional: true },
      ],
    },
  ];

  for (const schema of schemas) {
    try {
      await typesense.collections(schema.name).retrieve();
    } catch {
      await typesense.collections().create(schema as never);
    }
  }
};

const upsertSermon = async (entityId: string) => {
  const sermon = await prisma.sermon.findUnique({
    where: { id: entityId },
    include: {
      preacher: true,
      program: true,
      topics: {
        include: {
          topic: {
            include: { aliases: true },
          },
        },
      },
    },
  });

  if (!sermon || sermon.deletedAt) {
    await typesense.collections('sermons').documents(entityId).delete();
    return;
  }

  await typesense.collections('sermons').documents().upsert({
    id: sermon.id,
    title: sermon.title,
    description: sermon.description ?? '',
    preacher_name: sermon.preacher.displayName,
    program_name: sermon.program?.name ?? '',
    topics: sermon.topics.map((entry) => entry.topic.name),
    aliases: sermon.topics.flatMap((entry) => entry.topic.aliases.map((alias) => alias.alias)),
    status: sermon.status,
  });
};

const upsertPreacher = async (entityId: string) => {
  const preacher = await prisma.preacher.findUnique({ where: { id: entityId } });
  if (!preacher || preacher.deletedAt) {
    await typesense.collections('preachers').documents(entityId).delete();
    return;
  }

  await typesense.collections('preachers').documents().upsert({
    id: preacher.id,
    display_name: preacher.displayName,
    aliases: [],
  });
};

const upsertProgram = async (entityId: string) => {
  const program = await prisma.program.findUnique({ where: { id: entityId } });
  if (!program || program.deletedAt) {
    await typesense.collections('programs').documents(entityId).delete();
    return;
  }

  await typesense.collections('programs').documents().upsert({
    id: program.id,
    name: program.name,
    theme: program.theme ?? '',
    organizer: program.organizer ?? '',
  });
};

const upsertTopic = async (entityId: string) => {
  const topic = await prisma.topic.findUnique({
    where: { id: entityId },
    include: { aliases: true },
  });
  if (!topic || topic.deletedAt || !topic.isActive) {
    await typesense.collections('topics').documents(entityId).delete();
    return;
  }

  await typesense.collections('topics').documents().upsert({
    id: topic.id,
    name: topic.name,
    aliases: topic.aliases.map((entry) => entry.alias),
  });
};

const main = async () => {
  await ensureCollections();

  const worker = new Worker(
    'search-indexing',
    async (job) => {
      const entityType = String(job.data.entityType);
      const entityId = String(job.data.entityId);

      if (!entityType || !entityId) {
        throw new Error('entityType and entityId are required');
      }

      switch (entityType) {
        case 'sermon':
          await upsertSermon(entityId);
          break;
        case 'preacher':
          await upsertPreacher(entityId);
          break;
        case 'program':
          await upsertProgram(entityId);
          break;
        case 'topic':
          await upsertTopic(entityId);
          break;
        default:
          throw new Error(`Unsupported entityType: ${entityType}`);
      }
    },
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on('completed', (job) => {
    console.info(`[search-worker] completed job ${job.id}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[search-worker] failed job ${job?.id ?? 'unknown'}: ${error.message}`);
  });

  process.on('SIGINT', async () => {
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  });

  console.info('[search-worker] running');
};

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
