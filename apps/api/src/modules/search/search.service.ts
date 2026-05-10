import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppEnv } from '@wordcast/config';
import { PrismaService } from '../../prisma/prisma.service';
import Typesense from 'typesense';
import Client from 'typesense/lib/Typesense/Client';
import { SearchQueryDto } from './dto/search-query.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { EntitlementsSummaryDto } from '../../common/dto/public.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly client: Client;

  constructor(
    configService: ConfigService<AppEnv>,
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {
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

  async search(query: SearchQueryDto, userId?: string) {
    const normalizedTypes = this.normalizeTypes(query.types);
    const entitlementSummary = userId ? await this.subscriptionsService.getEntitlementSummary(userId) : null;
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    try {
      const { searches, keys } = this.buildSearches(normalizedTypes, query.q, page, limit);
      const result = await this.client.multiSearch.perform({ searches });
      const idsByType = this.extractIds(result, keys);

      const [sermons, preachers, programs, topics] = await Promise.all([
        this.mapSermonSummaries(idsByType.sermons, entitlementSummary),
        this.mapPreacherSummaries(idsByType.preachers),
        this.mapProgramSummaries(idsByType.programs),
        this.mapTopicSummaries(idsByType.topics),
      ]);

      return {
        sermons,
        preachers,
        programs,
        topics,
      };
    } catch (error) {
      this.logger.warn(`Typesense unavailable, using fallback search: ${String(error)}`);

      const [sermons, preachers, programs, topics] = await Promise.all([
        normalizedTypes.includes('sermons')
          ? this.prisma.sermon.findMany({
              where: {
                status: 'PUBLISHED',
                deletedAt: null,
                OR: [
                  { title: { contains: query.q, mode: 'insensitive' } },
                  { description: { contains: query.q, mode: 'insensitive' } },
                ],
              },
              take: limit,
              include: {
                preacher: { select: { id: true, displayName: true, slug: true, profileImageUrl: true } },
                program: { select: { id: true, name: true, slug: true, coverImage: true, year: true } },
                session: { select: { id: true, name: true, slug: true } },
                topics: { include: { topic: true } },
                mediaAssets: {
                  where: { type: 'PROCESSED_AUDIO', status: 'PUBLISHED' },
                  select: { id: true, cdnUrl: true, durationSeconds: true },
                  take: 1,
                },
              },
            })
          : [],
        normalizedTypes.includes('preachers')
          ? this.prisma.preacher.findMany({
              where: { displayName: { contains: query.q, mode: 'insensitive' }, deletedAt: null },
              take: limit,
              select: { id: true, displayName: true, slug: true, profileImageUrl: true },
            })
          : [],
        normalizedTypes.includes('programs')
          ? this.prisma.program.findMany({
              where: {
                deletedAt: null,
                OR: [
                  { name: { contains: query.q, mode: 'insensitive' } },
                  { theme: { contains: query.q, mode: 'insensitive' } },
                  { organizer: { contains: query.q, mode: 'insensitive' } },
                ],
              },
              take: limit,
              select: { id: true, name: true, slug: true, year: true, coverImage: true },
            })
          : [],
        normalizedTypes.includes('topics')
          ? this.prisma.topic.findMany({
              where: {
                deletedAt: null,
                isActive: true,
                OR: [
                  { name: { contains: query.q, mode: 'insensitive' } },
                  { aliases: { some: { alias: { contains: query.q, mode: 'insensitive' } } } },
                ],
              },
              include: { aliases: true },
              take: limit,
            })
          : [],
      ]);

      return {
        sermons: sermons.map((item) => this.toSermonSummary(item, entitlementSummary)),
        preachers: preachers.map((item) => this.toPreacherSummary(item)),
        programs: programs.map((item) => this.toProgramSummary(item)),
        topics: topics.map((item) => this.toTopicSummary(item)),
      };
    }
  }

  async suggestions(query: SearchQueryDto) {
    const normalizedTypes = this.normalizeTypes(query.types);
    const limit = Math.min(query.limit ?? 6, 10);
    const page = 1;

    try {
      const { searches, keys } = this.buildSearches(normalizedTypes, query.q, page, limit);
      const result = await this.client.multiSearch.perform({ searches });
      const idsByType = this.extractIds(result, keys);

      const [sermons, preachers, programs, topics] = await Promise.all([
        this.mapSermonSummaries(idsByType.sermons),
        this.mapPreacherSummaries(idsByType.preachers),
        this.mapProgramSummaries(idsByType.programs),
        this.mapTopicSummaries(idsByType.topics),
      ]);

      return {
        sermons,
        preachers,
        programs,
        topics,
      };
    } catch (error) {
      this.logger.warn(`Typesense unavailable, using fallback suggestions: ${String(error)}`);

      const [sermons, preachers, programs, topics] = await Promise.all([
        normalizedTypes.includes('sermons')
          ? this.prisma.sermon.findMany({
              where: {
                status: 'PUBLISHED',
                deletedAt: null,
                OR: [
                  { title: { contains: query.q, mode: 'insensitive' } },
                  { description: { contains: query.q, mode: 'insensitive' } },
                ],
              },
              take: limit,
              include: {
                preacher: { select: { id: true, displayName: true, slug: true, profileImageUrl: true } },
                program: { select: { id: true, name: true, slug: true, coverImage: true, year: true } },
                session: { select: { id: true, name: true, slug: true } },
                topics: { include: { topic: true } },
                mediaAssets: {
                  where: { type: 'PROCESSED_AUDIO', status: 'PUBLISHED' },
                  select: { id: true, cdnUrl: true, durationSeconds: true },
                  take: 1,
                },
              },
            })
          : [],
        normalizedTypes.includes('preachers')
          ? this.prisma.preacher.findMany({
              where: { displayName: { contains: query.q, mode: 'insensitive' }, deletedAt: null },
              take: limit,
              select: { id: true, displayName: true, slug: true, profileImageUrl: true },
            })
          : [],
        normalizedTypes.includes('programs')
          ? this.prisma.program.findMany({
              where: {
                deletedAt: null,
                OR: [
                  { name: { contains: query.q, mode: 'insensitive' } },
                  { theme: { contains: query.q, mode: 'insensitive' } },
                  { organizer: { contains: query.q, mode: 'insensitive' } },
                ],
              },
              take: limit,
              select: { id: true, name: true, slug: true, year: true, coverImage: true },
            })
          : [],
        normalizedTypes.includes('topics')
          ? this.prisma.topic.findMany({
              where: {
                deletedAt: null,
                isActive: true,
                OR: [
                  { name: { contains: query.q, mode: 'insensitive' } },
                  { aliases: { some: { alias: { contains: query.q, mode: 'insensitive' } } } },
                ],
              },
              include: { aliases: true },
              take: limit,
            })
          : [],
      ]);

      return {
        sermons: sermons.map((item) => this.toSermonSummary(item)),
        preachers: preachers.map((item) => this.toPreacherSummary(item)),
        programs: programs.map((item) => this.toProgramSummary(item)),
        topics: topics.map((item) => this.toTopicSummary(item)),
      };
    }
  }

  private normalizeTypes(types?: string[]) {
    const allowed = new Set(['sermons', 'preachers', 'programs', 'topics']);
    const normalized = (types ?? []).map((type) => type.toLowerCase()).filter((type) => allowed.has(type));
    return normalized.length ? normalized : ['sermons', 'preachers', 'programs', 'topics'];
  }

  private buildSearches(types: string[], q: string, page: number, limit: number) {
    const searches: Array<Record<string, unknown>> = [];
    const keys: Array<'sermons' | 'preachers' | 'programs' | 'topics'> = [];

    if (types.includes('sermons')) {
      searches.push({
        collection: 'sermons',
        q,
        query_by: 'title,description,preacher_name,program_name,topics,aliases',
        per_page: limit,
        page,
        filter_by: 'status:=PUBLISHED',
      });
      keys.push('sermons');
    }
    if (types.includes('preachers')) {
      searches.push({
        collection: 'preachers',
        q,
        query_by: 'display_name,aliases',
        per_page: limit,
        page,
      });
      keys.push('preachers');
    }
    if (types.includes('programs')) {
      searches.push({
        collection: 'programs',
        q,
        query_by: 'name,theme,organizer',
        per_page: limit,
        page,
      });
      keys.push('programs');
    }
    if (types.includes('topics')) {
      searches.push({
        collection: 'topics',
        q,
        query_by: 'name,aliases',
        per_page: limit,
        page,
      });
      keys.push('topics');
    }

    return { searches, keys };
  }

  private extractIds(
    result: { results: Array<{ hits?: Array<{ document: { id: string } }> }> },
    keys: Array<'sermons' | 'preachers' | 'programs' | 'topics'>,
  ) {
    const idsByType = {
      sermons: [] as string[],
      preachers: [] as string[],
      programs: [] as string[],
      topics: [] as string[],
    };

    result.results.forEach((entry: { hits?: Array<{ document: { id: string } }> }, index: number) => {
      const key = keys[index];
      if (!key) {
        return;
      }
      const hits = (entry as { hits?: Array<{ document: { id: string } }> }).hits ?? [];
      idsByType[key] = hits.map((hit) => hit.document.id);
    });

    return idsByType;
  }

  private async mapSermonSummaries(ids: string[], entitlements?: EntitlementsSummaryDto | null) {
    if (!ids.length) {
      return [];
    }

    const sermons = await this.prisma.sermon.findMany({
      where: { id: { in: ids }, status: 'PUBLISHED', deletedAt: null },
      include: {
        preacher: { select: { id: true, displayName: true, slug: true, profileImageUrl: true } },
        program: { select: { id: true, name: true, slug: true, coverImage: true, year: true } },
        session: { select: { id: true, name: true, slug: true } },
        topics: { include: { topic: true } },
        mediaAssets: {
          where: { type: 'PROCESSED_AUDIO', status: 'PUBLISHED' },
          select: { id: true, cdnUrl: true, durationSeconds: true },
          take: 1,
        },
      },
    });

    const mapById = new Map(sermons.map((sermon) => [sermon.id, sermon]));
    return ids
      .map((id) => mapById.get(id))
      .filter(Boolean)
      .map((sermon) => this.toSermonSummary(sermon!, entitlements));
  }

  private async mapPreacherSummaries(ids: string[]) {
    if (!ids.length) {
      return [];
    }
    const preachers = await this.prisma.preacher.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, displayName: true, slug: true, profileImageUrl: true },
    });
    const mapById = new Map(preachers.map((preacher) => [preacher.id, preacher]));
    return ids.map((id) => mapById.get(id)).filter(Boolean).map((item) => this.toPreacherSummary(item!));
  }

  private async mapProgramSummaries(ids: string[]) {
    if (!ids.length) {
      return [];
    }
    const programs = await this.prisma.program.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, name: true, slug: true, year: true, coverImage: true },
    });
    const mapById = new Map(programs.map((program) => [program.id, program]));
    return ids.map((id) => mapById.get(id)).filter(Boolean).map((item) => this.toProgramSummary(item!));
  }

  private async mapTopicSummaries(ids: string[]) {
    if (!ids.length) {
      return [];
    }
    const topics = await this.prisma.topic.findMany({
      where: { id: { in: ids }, deletedAt: null, isActive: true },
      select: { id: true, name: true, slug: true },
    });
    const mapById = new Map(topics.map((topic) => [topic.id, topic]));
    return ids.map((id) => mapById.get(id)).filter(Boolean).map((item) => this.toTopicSummary(item!));
  }

  private toSermonSummary(
    sermon: {
      id: string;
      title: string;
      description: string | null;
      churchName: string | null;
      datePreached: Date | null;
      durationSeconds: number | null;
      publishedAt: Date | null;
      preacher?: { id: string; displayName: string; slug?: string | null; profileImageUrl?: string | null } | null;
      program?: { id: string; name: string; slug?: string | null; coverImage?: string | null; year?: number | null } | null;
      session?: { id: string; name: string; slug?: string | null } | null;
      topics?: Array<{ topic: { id: string; name: string; slug: string } }>;
      mediaAssets?: Array<{ id: string; cdnUrl: string | null; durationSeconds: number | null }>;
    },
    entitlements?: EntitlementsSummaryDto | null,
  ) {
    const audioAsset = sermon.mediaAssets?.[0];
    return {
      id: sermon.id,
      title: sermon.title,
      description: sermon.description,
      churchName: sermon.churchName,
      datePreached: sermon.datePreached?.toISOString() ?? null,
      durationSeconds: audioAsset?.durationSeconds ?? sermon.durationSeconds,
      publishedAt: sermon.publishedAt?.toISOString() ?? null,
      preacher: sermon.preacher
        ? {
            id: sermon.preacher.id,
            displayName: sermon.preacher.displayName,
            slug: sermon.preacher.slug ?? undefined,
            profileImageUrl: sermon.preacher.profileImageUrl ?? null,
          }
        : null,
      program: sermon.program
        ? {
            id: sermon.program.id,
            name: sermon.program.name,
            slug: sermon.program.slug ?? undefined,
            year: sermon.program.year ?? null,
            coverImage: sermon.program.coverImage ?? null,
          }
        : null,
      session: sermon.session
        ? {
            id: sermon.session.id,
            name: sermon.session.name,
            slug: sermon.session.slug ?? undefined,
          }
        : null,
      topics: sermon.topics?.map((entry) => ({
        id: entry.topic.id,
        name: entry.topic.name,
        slug: entry.topic.slug,
      })),
      playbackUrl: audioAsset?.cdnUrl ?? null,
      entitlements: entitlements
        ? {
            transcriptAccess: entitlements.transcriptAccess,
            downloadAccess: entitlements.downloadAccess,
            adFree: entitlements.adFree,
            enhancedLinking: entitlements.enhancedLinking,
          }
        : undefined,
    };
  }

  private toPreacherSummary(preacher: { id: string; displayName: string; slug?: string | null; profileImageUrl?: string | null }) {
    return {
      id: preacher.id,
      displayName: preacher.displayName,
      slug: preacher.slug ?? undefined,
      profileImageUrl: preacher.profileImageUrl ?? null,
    };
  }

  private toProgramSummary(program: { id: string; name: string; slug?: string | null; year?: number | null; coverImage?: string | null }) {
    return {
      id: program.id,
      name: program.name,
      slug: program.slug ?? undefined,
      year: program.year ?? null,
      coverImage: program.coverImage ?? null,
    };
  }

  private toTopicSummary(topic: { id: string; name: string; slug: string }) {
    return {
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
    };
  }
}
