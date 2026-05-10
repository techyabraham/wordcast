import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toSlug } from '../../common/utils/slug.util';
import { CreatePreacherDto, UpdatePreacherDto } from './dto/preacher.dto';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { QueueService } from '../queues/queue.service';
import { CacheService } from '../cache/cache.service';

const PREACHERS_LIST_TTL = 300; // 5 minutes — follower counts shift more than topics
const PREACHERS_LIST_PREFIX = 'preachers:list:';

@Injectable()
export class PreachersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
    private readonly cache: CacheService,
  ) {}

  async list(query: PaginationQueryDto) {
    const cacheKey = `${PREACHERS_LIST_PREFIX}p${query.page}:s${query.pageSize}`;
    const cached = await this.cache.get<{ items: unknown[]; meta: unknown }>(cacheKey);
    if (cached) return cached;

    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.preacher.findMany({
        where: { deletedAt: null },
        skip,
        take: query.pageSize,
        orderBy: [{ followerCount: 'desc' }, { displayName: 'asc' }],
        include: {
          ministry: { select: { name: true } },
          _count: {
            select: {
              sermons: {
                where: { deletedAt: null },
              },
            },
          },
        },
      }),
      this.prisma.preacher.count({ where: { deletedAt: null } }),
    ]);

    const result = {
      items: items.map((item) => ({
        id: item.id,
        displayName: item.displayName,
        slug: item.slug,
        profileImageUrl: item.profileImageUrl,
        country: item.country,
        followerCount: item.followerCount,
        ministryName: item.ministry?.name ?? null,
        sermonCount: item._count.sermons,
        createdAt: item.createdAt,
      })),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };

    await this.cache.set(cacheKey, result, PREACHERS_LIST_TTL);
    return result;
  }

  async getById(id: string) {
    const preacher = await this.prisma.preacher.findFirst({
      where: { id, deletedAt: null },
      include: {
        ministry: { select: { name: true } },
      },
    });

    if (!preacher) {
      throw new NotFoundException('Preacher not found');
    }
    const [topSermons, latestSermons, relatedPrograms, topTopics] = await Promise.all([
      this.prisma.sermon.findMany({
        where: { preacherId: id, status: 'PUBLISHED', deletedAt: null },
        orderBy: [{ playCount: 'desc' }, { publishedAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          title: true,
          publishedAt: true,
          playCount: true,
        },
      }),
      this.prisma.sermon.findMany({
        where: { preacherId: id, status: 'PUBLISHED', deletedAt: null },
        orderBy: [{ publishedAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          title: true,
          publishedAt: true,
        },
      }),
      this.prisma.program.findMany({
        where: {
          sermons: { some: { preacherId: id, status: 'PUBLISHED', deletedAt: null } },
          deletedAt: null,
        },
        take: 5,
        select: { id: true, name: true, year: true, coverImage: true },
      }),
      this.prisma.sermonTopic
        .groupBy({
          by: ['topicId'],
          where: {
            sermon: {
              preacherId: id,
              status: 'PUBLISHED',
              deletedAt: null,
            },
          },
          _count: { topicId: true },
          orderBy: { _count: { topicId: 'desc' } },
          take: 8,
        })
        .then(async (grouped) => {
          const ids = grouped.map((entry) => entry.topicId);
          return this.prisma.topic.findMany({
            where: { id: { in: ids }, isActive: true, deletedAt: null },
            select: { id: true, name: true, slug: true },
          });
        }),
    ]);

    return {
      id: preacher.id,
      displayName: preacher.displayName,
      biography: preacher.biography,
      profileImageUrl: preacher.profileImageUrl,
      country: preacher.country,
      followerCount: preacher.followerCount,
      ministryName: preacher.ministry?.name ?? null,
      topSermons: topSermons.map((sermon) => ({
        id: sermon.id,
        title: sermon.title,
        publishedAt: sermon.publishedAt,
        playCount: sermon.playCount,
      })),
      latestSermons: latestSermons.map((sermon) => ({
        id: sermon.id,
        title: sermon.title,
        publishedAt: sermon.publishedAt,
      })),
      relatedPrograms,
      topTopics,
    };
  }

  async follow(preacherId: string, userId: string) {
    const preacher = await this.prisma.preacher.findFirst({ where: { id: preacherId, deletedAt: null } });
    if (!preacher) {
      throw new NotFoundException('Preacher not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.preacherFollow.upsert({
        where: {
          userId_preacherId: {
            userId,
            preacherId,
          },
        },
        create: {
          userId,
          preacherId,
        },
        update: {},
      });

      await tx.preacher.update({
        where: { id: preacherId },
        data: {
          followerCount: await tx.preacherFollow.count({ where: { preacherId } }),
        },
      });
    });

    await this.cache.delByPrefix(PREACHERS_LIST_PREFIX);

    return { ok: true };
  }

  async unfollow(preacherId: string, userId: string) {
    const preacher = await this.prisma.preacher.findFirst({ where: { id: preacherId, deletedAt: null } });
    if (!preacher) {
      throw new NotFoundException('Preacher not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.preacherFollow.deleteMany({
        where: {
          userId,
          preacherId,
        },
      });

      await tx.preacher.update({
        where: { id: preacherId },
        data: {
          followerCount: await tx.preacherFollow.count({ where: { preacherId } }),
        },
      });
    });

    await this.cache.delByPrefix(PREACHERS_LIST_PREFIX);

    return { ok: true };
  }

  async create(dto: CreatePreacherDto, actor: AuthenticatedUser) {
    const slug = await this.uniqueSlug(toSlug(dto.displayName));
    const ministryId = await this.resolveMinistryId(dto.ministryId, dto.ministryName);

    const data: Prisma.PreacherCreateInput = {
      displayName: dto.displayName,
      slug,
      ...(dto.biography !== undefined ? { biography: dto.biography } : {}),
      ...(dto.profileImageUrl !== undefined ? { profileImageUrl: dto.profileImageUrl } : {}),
      ...(dto.country !== undefined ? { country: dto.country } : {}),
      ...(ministryId ? { ministry: { connect: { id: ministryId } } } : {}),
    };

    const preacher = await this.prisma.preacher.create({
      data,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'preacher.create',
      entityType: 'Preacher',
      entityId: preacher.id,
    });

    await this.queueService.enqueueSearchSync({
      entityType: 'preacher',
      entityId: preacher.id,
      action: 'upsert',
    });

    await this.cache.delByPrefix(PREACHERS_LIST_PREFIX);

    return preacher;
  }

  async update(id: string, dto: UpdatePreacherDto, actor: AuthenticatedUser) {
    const preacher = await this.prisma.preacher.findFirst({ where: { id, deletedAt: null } });
    if (!preacher) {
      throw new NotFoundException('Preacher not found');
    }
    const ministryId = await this.resolveMinistryId(dto.ministryId, dto.ministryName);

    const data: Prisma.PreacherUpdateInput = {
      ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
      ...(dto.biography !== undefined ? { biography: dto.biography } : {}),
      ...(dto.profileImageUrl !== undefined ? { profileImageUrl: dto.profileImageUrl } : {}),
      ...(dto.country !== undefined ? { country: dto.country } : {}),
      ...((dto.ministryId !== undefined || dto.ministryName !== undefined)
        ? { ministry: ministryId ? { connect: { id: ministryId } } : { disconnect: true } }
        : {}),
    };

    const updated = await this.prisma.preacher.update({
      where: { id },
      data,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'preacher.edit',
      entityType: 'Preacher',
      entityId: preacher.id,
    });

    await this.queueService.enqueueSearchSync({
      entityType: 'preacher',
      entityId: preacher.id,
      action: 'upsert',
    });

    await this.cache.delByPrefix(PREACHERS_LIST_PREFIX);

    return updated;
  }

  private async uniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug || 'preacher';
    let counter = 1;
    while (true) {
      const exists = await this.prisma.preacher.findUnique({ where: { slug } });
      if (!exists) {
        return slug;
      }
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }
  }

  private async resolveMinistryId(ministryId?: string, ministryName?: string) {
    if (ministryId) {
      return ministryId;
    }

    if (!ministryName) {
      return undefined;
    }

    const normalizedName = ministryName.trim();
    if (!normalizedName) {
      return undefined;
    }

    const existing = await this.prisma.ministry.findFirst({
      where: { name: { equals: normalizedName, mode: 'insensitive' }, deletedAt: null },
      select: { id: true },
    });

    if (existing) {
      return existing.id;
    }

    const baseSlug = toSlug(normalizedName) || 'ministry';
    let slug = baseSlug;
    let counter = 1;

    while (await this.prisma.ministry.findUnique({ where: { slug } })) {
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }

    const ministry = await this.prisma.ministry.create({
      data: {
        name: normalizedName,
        slug,
      },
      select: { id: true },
    });

    return ministry.id;
  }
}
