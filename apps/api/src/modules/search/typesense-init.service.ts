import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppEnv } from '@wordcast/config';
import Typesense from 'typesense';
import Client from 'typesense/lib/Typesense/Client';
import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';

const COLLECTIONS: CollectionCreateSchema[] = [
  {
    name: 'sermons',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'title', type: 'string' },
      { name: 'description', type: 'string', optional: true },
      { name: 'preacher_name', type: 'string', optional: true },
      { name: 'program_name', type: 'string', optional: true },
      { name: 'topics', type: 'string[]', optional: true },
      { name: 'aliases', type: 'string[]', optional: true },
      { name: 'status', type: 'string', facet: true },
      { name: 'published_at', type: 'int64', optional: true },
    ],
    default_sorting_field: 'published_at',
  },
  {
    name: 'preachers',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'display_name', type: 'string' },
      { name: 'aliases', type: 'string[]', optional: true },
      { name: 'follower_count', type: 'int32', optional: true },
    ],
    default_sorting_field: 'follower_count',
  },
  {
    name: 'programs',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'theme', type: 'string', optional: true },
      { name: 'organizer', type: 'string', optional: true },
      { name: 'year', type: 'int32', optional: true },
    ],
  },
  {
    name: 'topics',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'aliases', type: 'string[]', optional: true },
      { name: 'sermon_count', type: 'int32', optional: true },
    ],
  },
];

@Injectable()
export class TypesenseInitService implements OnModuleInit {
  private readonly logger = new Logger(TypesenseInitService.name);
  readonly client: Client;

  constructor(configService: ConfigService<AppEnv>) {
    this.client = new Typesense.Client({
      nodes: [
        {
          host: configService.getOrThrow('TYPESENSE_HOST'),
          port: configService.getOrThrow<number>('TYPESENSE_PORT'),
          protocol: configService.getOrThrow<'http' | 'https'>('TYPESENSE_PROTOCOL'),
        },
      ],
      apiKey: configService.getOrThrow('TYPESENSE_API_KEY'),
      connectionTimeoutSeconds: 5,
    });
  }

  async onModuleInit() {
    try {
      await this.ensureCollections();
      this.logger.log('Typesense collections verified');
    } catch (err) {
      // Non-fatal — search falls back to Prisma ILIKE when Typesense is unavailable
      this.logger.warn(`Typesense init skipped (unavailable at startup): ${String(err)}`);
    }
  }

  private async ensureCollections() {
    const existing = await this.client.collections().retrieve();
    const existingNames = new Set(existing.map((c) => c.name));

    for (const schema of COLLECTIONS) {
      if (existingNames.has(schema.name)) {
        continue;
      }
      await this.client.collections().create(schema);
      this.logger.log(`Created Typesense collection: ${schema.name}`);
    }
  }
}
