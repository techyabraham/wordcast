import { Injectable, NotFoundException } from '@nestjs/common';
import { TopicSuggestionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toSlug } from '../../common/utils/slug.util';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateTopicDto, UpdateTopicDto } from './dto/topic.dto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { QueueService } from '../queues/queue.service';
import { CacheService } from '../cache/cache.service';

const TOPICS_LIST_TTL = 600; // 10 minutes — topics change rarely
const TOPICS_LIST_PREFIX = 'topics:list:';

@Injectable()
export class TopicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
    private readonly cache: CacheService,
  ) {}

  async list(query: PaginationQueryDto) {
    const cacheKey = `${TOPICS_LIST_PREFIX}p${query.page}:s${query.pageSize}`;
    const cached = await this.cache.get<ReturnType<typeof this.mapTopicList>>(cacheKey);
    if (cached) return cached;

    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.topic.findMany({
        where: { deletedAt: null, isActive: true },
        skip,
        take: query.pageSize,
        include: {
          aliases: true,
          _count: {
            select: {
              sermons: {
                where: { sermon: { deletedAt: null } },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.topic.count({ where: { deletedAt: null, isActive: true } }),
    ]);

    const result = this.mapTopicList(items, total, query);
    await this.cache.set(cacheKey, result, TOPICS_LIST_TTL);
    return result;
  }

  private mapTopicList(
    items: Array<{
      id: string;
      name: string;
      slug: string;
      description: string | null;
      isSystem: boolean;
      isActive: boolean;
      aliases: Array<{ alias: string }>;
      _count: { sermons: number };
    }>,
    total: number,
    query: PaginationQueryDto,
  ) {
    return {
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        description: item.description,
        isSystem: item.isSystem,
        isActive: item.isActive,
        aliases: item.aliases.map((alias) => alias.alias),
        sermonCount: item._count.sermons,
      })),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async listAdmin(query: PaginationQueryDto) {
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.topic.findMany({
        where: { deletedAt: null },
        skip,
        take: query.pageSize,
        include: {
          aliases: true,
          _count: {
            select: {
              sermons: {
                where: { sermon: { deletedAt: null } },
              },
            },
          },
        },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.topic.count({ where: { deletedAt: null } }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        description: item.description,
        isSystem: item.isSystem,
        isActive: item.isActive,
        aliases: item.aliases.map((alias) => alias.alias),
        sermonCount: item._count.sermons,
      })),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async getAdminById(id: string) {
    const topic = await this.prisma.topic.findFirst({
      where: { id, deletedAt: null },
      include: {
        aliases: true,
        sermons: {
          include: {
            sermon: {
              select: {
                id: true,
                title: true,
                status: true,
                preacher: { select: { id: true, displayName: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    return {
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
      description: topic.description,
      isSystem: topic.isSystem,
      isActive: topic.isActive,
      aliases: topic.aliases.map((alias) => alias.alias),
      sermons: topic.sermons.map((entry) => entry.sermon),
      sermonCount: topic.sermons.length,
    };
  }

  async getBySlug(slug: string) {
    const topic = await this.prisma.topic.findFirst({
      where: { slug, deletedAt: null, isActive: true },
      include: { aliases: true },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }
    const [topSermons, featuredPreachers, relatedPrograms, soundBites] = await Promise.all([
      this.prisma.sermon.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
          topics: { some: { topicId: topic.id } },
        },
        orderBy: [{ playCount: 'desc' }, { publishedAt: 'desc' }],
        take: 6,
        select: { id: true, title: true, publishedAt: true },
      }),
      this.prisma.preacher.findMany({
        where: {
          sermons: { some: { topics: { some: { topicId: topic.id } }, status: 'PUBLISHED', deletedAt: null } },
          deletedAt: null,
        },
        take: 6,
        select: { id: true, displayName: true, profileImageUrl: true },
      }),
      this.prisma.program.findMany({
        where: {
          sermons: { some: { topics: { some: { topicId: topic.id } }, status: 'PUBLISHED', deletedAt: null } },
          deletedAt: null,
        },
        take: 4,
        select: { id: true, name: true, year: true, coverImage: true },
      }),
      this.prisma.soundBite.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
          sermon: { topics: { some: { topicId: topic.id } }, status: 'PUBLISHED', deletedAt: null },
        },
        take: 5,
        select: { id: true, title: true, quoteText: true, startSeconds: true, endSeconds: true },
      }),
    ]);

    return {
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
      description: topic.description,
      aliases: topic.aliases.map((alias) => alias.alias),
      topSermons,
      featuredPreachers,
      relatedPrograms,
      soundBites,
    };
  }

  async create(dto: CreateTopicDto, actor: AuthenticatedUser) {
    const slug = await this.uniqueSlug(toSlug(dto.name));

    const topic = await this.prisma.topic.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
        ...(dto.aliases?.length
          ? {
              aliases: {
                createMany: {
                  data: dto.aliases.map((alias) => ({
                    alias,
                    normalized: alias.toLowerCase(),
                  })),
                  skipDuplicates: true,
                },
              },
            }
          : {}),
      },
      include: {
        aliases: true,
      },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'topic.create',
      entityType: 'Topic',
      entityId: topic.id,
    });

    await this.queueService.enqueueSearchSync({
      entityType: 'topic',
      entityId: topic.id,
      action: 'upsert',
    });

    await this.cache.delByPrefix(TOPICS_LIST_PREFIX);

    return topic;
  }

  async update(id: string, dto: UpdateTopicDto, actor: AuthenticatedUser) {
    const topic = await this.prisma.topic.findFirst({ where: { id, deletedAt: null } });
    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.aliases) {
        await tx.topicAlias.deleteMany({ where: { topicId: id } });
      }

      return tx.topic.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.aliases
            ? {
                aliases: {
                  createMany: {
                    data: dto.aliases.map((alias) => ({
                      alias,
                      normalized: alias.toLowerCase(),
                    })),
                    skipDuplicates: true,
                  },
                },
              }
            : {}),
        },
        include: {
          aliases: true,
        },
      });
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'topic.edit',
      entityType: 'Topic',
      entityId: id,
    });

    await this.queueService.enqueueSearchSync({
      entityType: 'topic',
      entityId: id,
      action: 'upsert',
    });

    await this.cache.delByPrefix(TOPICS_LIST_PREFIX);

    return updated;
  }

  async listSuggestions(query: PaginationQueryDto, status?: string) {
    const skip = (query.page - 1) * query.pageSize;
    const where = status
      ? {
          status: status as TopicSuggestionStatus,
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.topicSuggestion.findMany({
        where,
        skip,
        take: query.pageSize,
        include: {
          sermon: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.topicSuggestion.count({ where }),
    ]);

    return {
      items,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async approveSuggestion(id: string, actor: AuthenticatedUser) {
    const suggestion = await this.prisma.topicSuggestion.findUnique({ where: { id } });
    if (!suggestion) {
      throw new NotFoundException('Suggestion not found');
    }

    const slug = await this.uniqueSlug(toSlug(suggestion.proposedName));
    const topic = await this.prisma.topic.create({
      data: {
        name: suggestion.proposedName,
        slug,
        isActive: true,
      },
    });

    await this.prisma.topicSuggestion.update({
      where: { id },
      data: {
        status: 'APPROVED',
        matchedTopicId: topic.id,
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'topic.suggestion.approve',
      entityType: 'TopicSuggestion',
      entityId: id,
      metadata: { topicId: topic.id },
    });

    return { topicId: topic.id };
  }

  async mergeSuggestion(id: string, topicId: string, actor: AuthenticatedUser) {
    const suggestion = await this.prisma.topicSuggestion.findUnique({ where: { id } });
    if (!suggestion) {
      throw new NotFoundException('Suggestion not found');
    }

    await this.prisma.topicSuggestion.update({
      where: { id },
      data: {
        status: 'APPROVED',
        matchedTopicId: topicId,
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'topic.suggestion.merge',
      entityType: 'TopicSuggestion',
      entityId: id,
      metadata: { topicId },
    });

    return { success: true };
  }

  async rejectSuggestion(id: string, actor: AuthenticatedUser) {
    const suggestion = await this.prisma.topicSuggestion.findUnique({ where: { id } });
    if (!suggestion) {
      throw new NotFoundException('Suggestion not found');
    }

    await this.prisma.topicSuggestion.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'topic.suggestion.reject',
      entityType: 'TopicSuggestion',
      entityId: id,
    });

    return { success: true };
  }

  private async uniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug || 'topic';
    let counter = 1;

    while (true) {
      const exists = await this.prisma.topic.findUnique({ where: { slug } });
      if (!exists) {
        return slug;
      }
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }
  }
}
