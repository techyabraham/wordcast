import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SermonStatus } from '@prisma/client';
import { toSlug } from '../../common/utils/slug.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CreateSermonDto } from './dto/create-sermon.dto';
import { SermonQueryDto } from './dto/sermon-query.dto';
import { UpdateSermonDto } from './dto/update-sermon.dto';
import { AuditService } from '../audit/audit.service';
import { QueueService } from '../queues/queue.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { MediaService } from '../media/media.service';

@Injectable()
export class SermonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly mediaService: MediaService,
  ) {}

  async listPublic(query: SermonQueryDto, userId?: string) {
    const skip = (query.page - 1) * query.pageSize;
    const entitlementSummary = userId ? await this.subscriptionsService.getEntitlementSummary(userId) : null;

    const where: Prisma.SermonWhereInput = {
      status: SermonStatus.PUBLISHED,
      deletedAt: null,
      ...(query.preacherId ? { preacherId: query.preacherId } : {}),
      ...(query.programId ? { programId: query.programId } : {}),
      ...(query.sessionId ? { sessionId: query.sessionId } : {}),
      ...(query.sourceType ? { sourceType: query.sourceType } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            datePreached: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.topic
        ? {
            topics: {
              some: {
                topic: {
                  OR: [
                    { slug: query.topic },
                    { aliases: { some: { alias: { contains: query.topic, mode: 'insensitive' } } } },
                  ],
                },
              },
            },
          }
        : {}),
    };

    const orderBy = this.resolvePublicSort(query.sort);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.sermon.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy,
        include: {
          preacher: { select: { id: true, displayName: true, slug: true, profileImageUrl: true } },
          program: { select: { id: true, name: true, slug: true, coverImage: true, year: true } },
          session: { select: { id: true, name: true, slug: true } },
          topics: { include: { topic: { select: { id: true, name: true, slug: true } } } },
          mediaAssets: {
            where: {
              type: 'PROCESSED_AUDIO',
              status: 'PUBLISHED',
            },
            select: { id: true, cdnUrl: true, durationSeconds: true },
            take: 1,
          },
        },
      }),
      this.prisma.sermon.count({ where }),
    ]);

    return {
      items: items.map((item) => {
        const audioAsset = item.mediaAssets[0];
        return {
          id: item.id,
          title: item.title,
          description: item.description,
          churchName: item.churchName,
          datePreached: item.datePreached,
          durationSeconds: audioAsset?.durationSeconds ?? item.durationSeconds,
          publishedAt: item.publishedAt,
          preacher: item.preacher,
          program: item.program,
          session: item.session,
          topics: item.topics.map((entry) => entry.topic),
          playbackUrl: audioAsset?.cdnUrl ?? null,
          entitlements: {
            transcriptAccess: entitlementSummary?.transcriptAccess ?? false,
            downloadAccess: entitlementSummary?.downloadAccess ?? false,
            adFree: entitlementSummary?.adFree ?? false,
            enhancedLinking: entitlementSummary?.enhancedLinking ?? false,
          },
        };
      }),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async getPublicById(id: string, userId?: string) {
    const entitlementSummary = userId ? await this.subscriptionsService.getEntitlementSummary(userId) : null;
    const sermon = await this.prisma.sermon.findFirst({
      where: {
        id,
        status: SermonStatus.PUBLISHED,
        deletedAt: null,
      },
      include: {
        preacher: { select: { id: true, displayName: true, slug: true, profileImageUrl: true } },
        program: { select: { id: true, name: true, slug: true, coverImage: true, year: true } },
        session: { select: { id: true, name: true, slug: true } },
        topics: { include: { topic: { select: { id: true, name: true, slug: true } } } },
        transcripts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        soundBites: {
          where: { status: 'PUBLISHED', deletedAt: null },
          orderBy: { startSeconds: 'asc' },
          include: {
            clipAsset: {
              select: { cdnUrl: true, durationSeconds: true },
            },
          },
        },
        mediaAssets: {
          where: { status: 'PUBLISHED' },
        },
      },
    });

    if (!sermon) {
      throw new NotFoundException('Sermon not found');
    }

    const audioAsset = sermon.mediaAssets.find((asset) => asset.type === 'PROCESSED_AUDIO');
    const latestTranscript = sermon.transcripts[0];
    const transcriptText = latestTranscript?.fullText ?? sermon.transcript ?? null;

    return {
      id: sermon.id,
      title: sermon.title,
      description: sermon.description,
      churchName: sermon.churchName,
      datePreached: sermon.datePreached,
      durationSeconds: audioAsset?.durationSeconds ?? sermon.durationSeconds,
      publishedAt: sermon.publishedAt,
      preacher: sermon.preacher,
      program: sermon.program,
      session: sermon.session,
      topics: sermon.topics.map((entry) => entry.topic),
      transcriptPreview: transcriptText ? transcriptText.slice(0, 280) : null,
      soundBites: sermon.soundBites.map((bite) => ({
        id: bite.id,
        title: bite.title,
        quoteText: bite.quoteText,
        startSeconds: bite.startSeconds,
        endSeconds: bite.endSeconds,
        playbackUrl: bite.clipAsset?.cdnUrl ?? null,
        durationSeconds: bite.clipAsset?.durationSeconds ?? null,
      })),
      playbackUrl: audioAsset?.cdnUrl ?? null,
      entitlements: {
        transcriptAccess: entitlementSummary?.transcriptAccess ?? false,
        downloadAccess: entitlementSummary?.downloadAccess ?? false,
        adFree: entitlementSummary?.adFree ?? false,
        enhancedLinking: entitlementSummary?.enhancedLinking ?? false,
      },
    };
  }

  async listAdmin(query: SermonQueryDto) {
    const skip = (query.page - 1) * query.pageSize;

    const where: Prisma.SermonWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.preacherId ? { preacherId: query.preacherId } : {}),
      ...(query.programId ? { programId: query.programId } : {}),
      ...(query.sessionId ? { sessionId: query.sessionId } : {}),
      ...(query.sourceType ? { sourceType: query.sourceType } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            datePreached: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const orderBy = this.resolveAdminSort(query.sort);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.sermon.findMany({
        where,
        skip,
        take: query.pageSize,
        include: {
          preacher: { select: { displayName: true } },
          program: { select: { name: true } },
          session: { select: { name: true } },
        },
        orderBy,
      }),
      this.prisma.sermon.count({ where }),
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

  async getAdminById(id: string) {
    const sermon = await this.prisma.sermon.findFirst({
      where: { id, deletedAt: null },
      include: {
        preacher: true,
        program: true,
        session: true,
        topics: { include: { topic: { select: { id: true, name: true, slug: true } } } },
        soundBites: true,
        mediaAssets: true,
        aiMetadata: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!sermon) {
      throw new NotFoundException('Sermon not found');
    }

    return {
      ...sermon,
      topics: sermon.topics.map((entry) => entry.topic),
    };
  }

  async create(dto: CreateSermonDto, user: AuthenticatedUser) {
    const baseSlug = toSlug(dto.title);
    const slug = await this.ensureUniqueSlug(baseSlug || 'sermon');

    const sermon = await this.prisma.sermon.create({
      data: {
        title: dto.title,
        slug,
        churchName: dto.churchName ?? null,
        datePreached: dto.datePreached ? new Date(dto.datePreached) : null,
        durationSeconds: dto.durationSeconds ?? null,
        description: dto.description ?? null,
        language: dto.language ?? 'en',
        sourceType: dto.sourceType,
        sourceUrl: dto.sourceUrl ?? null,
        speakerRole: dto.speakerRole ?? 'OTHER',
        status: 'DRAFT',
        preacher: { connect: { id: dto.preacherId } },
        createdBy: { connect: { id: user.id } },
        ...(dto.programId ? { program: { connect: { id: dto.programId } } } : {}),
        ...(dto.sessionId ? { session: { connect: { id: dto.sessionId } } } : {}),
        ...(dto.topicIds?.length
          ? {
              topics: {
                createMany: {
                  data: dto.topicIds.map((topicId) => ({ topicId })),
                  skipDuplicates: true,
                },
              },
            }
          : {}),
        versions: {
          create: {
            versionNumber: 1,
            title: dto.title,
            description: dto.description ?? null,
            payload: dto as unknown as Prisma.InputJsonValue,
            createdById: user.id,
          },
        },
      } satisfies Prisma.SermonCreateInput,
      include: {
        topics: { include: { topic: true } },
      },
    });

    await this.auditService.log({
      actorUserId: user.id,
      action: 'sermon.create',
      entityType: 'Sermon',
      entityId: sermon.id,
      metadata: { title: sermon.title },
    });

    return {
      ...sermon,
      topics: sermon.topics.map((entry) => entry.topic),
    };
  }

  async update(id: string, dto: UpdateSermonDto, user: AuthenticatedUser) {
    const existing = await this.prisma.sermon.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new NotFoundException('Sermon not found');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.topicIds) {
        await tx.sermonTopic.deleteMany({ where: { sermonId: id } });
      }

      const record = await tx.sermon.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.churchName !== undefined ? { churchName: dto.churchName } : {}),
          ...(dto.preacherId ? { preacher: { connect: { id: dto.preacherId } } } : {}),
          ...(dto.programId !== undefined
            ? { program: dto.programId ? { connect: { id: dto.programId } } : { disconnect: true } }
            : {}),
          ...(dto.sessionId !== undefined
            ? { session: dto.sessionId ? { connect: { id: dto.sessionId } } : { disconnect: true } }
            : {}),
          ...(dto.datePreached !== undefined
            ? { datePreached: dto.datePreached ? new Date(dto.datePreached) : null }
            : {}),
          ...(dto.durationSeconds !== undefined ? { durationSeconds: dto.durationSeconds } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.language !== undefined ? { language: dto.language } : {}),
          ...(dto.sourceType !== undefined ? { sourceType: dto.sourceType } : {}),
          ...(dto.sourceUrl !== undefined ? { sourceUrl: dto.sourceUrl } : {}),
          ...(dto.speakerRole !== undefined ? { speakerRole: dto.speakerRole } : {}),
          ...(dto.topicIds
            ? {
                topics: {
                  createMany: {
                    data: dto.topicIds.map((topicId) => ({ topicId })),
                    skipDuplicates: true,
                  },
                },
              }
            : {}),
        } satisfies Prisma.SermonUpdateInput,
        include: {
          topics: { include: { topic: true } },
        },
      });

      const versionCount = await tx.sermonVersion.count({ where: { sermonId: id } });
      await tx.sermonVersion.create({
        data: {
          sermonId: id,
          versionNumber: versionCount + 1,
          title: record.title,
          description: record.description,
          transcript: record.transcript,
          payload: dto as unknown as Prisma.InputJsonValue,
          createdById: user.id,
        },
      });

      return record;
    });

    await this.auditService.log({
      actorUserId: user.id,
      action: 'sermon.edit',
      entityType: 'Sermon',
      entityId: id,
      metadata: { updatedFields: Object.keys(dto) },
    });

    return {
      ...updated,
      topics: updated.topics.map((entry) => entry.topic),
    };
  }

  async publish(id: string, user: AuthenticatedUser) {
    const sermon = await this.prisma.sermon.update({
      where: { id },
      data: {
        status: SermonStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    await this.auditService.log({
      actorUserId: user.id,
      action: 'sermon.publish',
      entityType: 'Sermon',
      entityId: id,
    });

    await this.queueService.enqueueSearchSync({
      entityType: 'sermon',
      entityId: id,
      action: 'upsert',
    });

    return sermon;
  }

  async archive(id: string, user: AuthenticatedUser) {
    const sermon = await this.prisma.sermon.update({
      where: { id },
      data: {
        status: SermonStatus.ARCHIVED,
      },
    });

    await this.auditService.log({
      actorUserId: user.id,
      action: 'sermon.archive',
      entityType: 'Sermon',
      entityId: id,
    });

    return sermon;
  }

  async getTranscriptForUser(sermonId: string, userId: string) {
    await this.subscriptionsService.assertEntitlement(userId, 'TRANSCRIPT_ACCESS');

    const transcript = await this.prisma.transcript.findFirst({
      where: { sermonId },
      orderBy: { createdAt: 'desc' },
    });

    if (transcript) {
      return {
        sermonId: transcript.sermonId,
        language: transcript.language,
        durationSeconds: transcript.durationSeconds,
        fullText: transcript.fullText,
        segments: transcript.segmentsJSON,
        createdAt: transcript.createdAt,
      };
    }

    const sermon = await this.prisma.sermon.findFirst({
      where: {
        id: sermonId,
        status: SermonStatus.PUBLISHED,
        deletedAt: null,
      },
      select: {
        id: true,
        transcript: true,
      },
    });

    if (!sermon || !sermon.transcript) {
      throw new NotFoundException('Transcript not available');
    }

    return {
      sermonId: sermon.id,
      language: 'en',
      durationSeconds: null,
      fullText: sermon.transcript,
      segments: [],
    };
  }

  async getDownloadForUser(sermonId: string, userId: string) {
    await this.subscriptionsService.assertEntitlement(userId, 'DOWNLOAD_ACCESS');

    const asset = await this.prisma.mediaAsset.findFirst({
      where: {
        sermonId,
        type: 'PROCESSED_AUDIO',
        status: 'PUBLISHED',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!asset) {
      throw new NotFoundException('Download asset not available');
    }

    if (asset.objectKey) {
      const signedUrl = await this.mediaService.getPlaybackUrl(asset.id);
      return { downloadUrl: signedUrl ?? asset.cdnUrl };
    }

    return { downloadUrl: asset.cdnUrl };
  }

  async getRelated(sermonId: string) {
    const sermon = await this.prisma.sermon.findFirst({
      where: { id: sermonId, status: SermonStatus.PUBLISHED, deletedAt: null },
      include: { topics: true },
    });

    if (!sermon) {
      throw new NotFoundException('Sermon not found');
    }

    const topicIds = sermon.topics.map((entry) => entry.topicId);

    const related = await this.prisma.sermon.findMany({
      where: {
        id: { not: sermonId },
        status: SermonStatus.PUBLISHED,
        deletedAt: null,
        OR: [
          { preacherId: sermon.preacherId },
          topicIds.length ? { topics: { some: { topicId: { in: topicIds } } } } : undefined,
        ].filter(Boolean) as Prisma.SermonWhereInput[],
      },
      take: 8,
      include: {
        preacher: { select: { id: true, displayName: true, slug: true } },
        program: { select: { id: true, name: true, slug: true } },
        session: { select: { id: true, name: true, slug: true } },
        topics: { include: { topic: true } },
        mediaAssets: {
          where: { type: 'PROCESSED_AUDIO', status: 'PUBLISHED' },
          select: { cdnUrl: true, durationSeconds: true },
          take: 1,
        },
      },
      orderBy: [{ publishedAt: 'desc' }],
    });

    const items = related.map((item) => {
      const audioAsset = item.mediaAssets[0];
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        datePreached: item.datePreached,
        durationSeconds: audioAsset?.durationSeconds ?? item.durationSeconds,
        preacher: item.preacher,
        program: item.program,
        session: item.session,
        topics: item.topics.map((entry) => entry.topic),
        playbackUrl: audioAsset?.cdnUrl ?? null,
      };
    });

    return { items };
  }

  async recordPlay(sermonId: string, userId?: string) {
    await this.prisma.sermon.update({
      where: { id: sermonId },
      data: {
        playCount: { increment: 1 },
      },
    });

    if (userId) {
      await this.prisma.listeningHistory.create({
        data: {
          userId,
          sermonId,
          progressSeconds: 0,
          completed: false,
        },
      });
    }

    return { ok: true };
  }

  async recordShare(sermonId: string, userId?: string) {
    await this.prisma.sermon.update({
      where: { id: sermonId },
      data: {
        shareCount: { increment: 1 },
      },
    });

    if (userId) {
      await this.auditService.log({
        actorUserId: userId,
        action: 'sermon.share',
        entityType: 'Sermon',
        entityId: sermonId,
      });
    }

    return { ok: true };
  }

  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const exists = await this.prisma.sermon.findUnique({ where: { slug } });
      if (!exists) {
        return slug;
      }

      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }
  }

  private resolvePublicSort(sort?: string): Prisma.SermonOrderByWithRelationInput[] {
    const normalized = sort?.toUpperCase();
    const map: Record<string, Prisma.SermonOrderByWithRelationInput[]> = {
      PUBLISHED_AT_DESC: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      PUBLISHED_AT_ASC: [{ publishedAt: 'asc' }, { createdAt: 'asc' }],
      DATE_PREACHED_DESC: [{ datePreached: 'desc' }, { createdAt: 'desc' }],
      DATE_PREACHED_ASC: [{ datePreached: 'asc' }, { createdAt: 'asc' }],
      CREATED_AT_DESC: [{ createdAt: 'desc' }],
      CREATED_AT_ASC: [{ createdAt: 'asc' }],
    };

    return map[normalized ?? ''] ?? [{ publishedAt: 'desc' }, { createdAt: 'desc' }];
  }

  private resolveAdminSort(sort?: string): Prisma.SermonOrderByWithRelationInput[] {
    const normalized = sort?.toUpperCase();
    const map: Record<string, Prisma.SermonOrderByWithRelationInput[]> = {
      UPDATED_AT_DESC: [{ updatedAt: 'desc' }],
      UPDATED_AT_ASC: [{ updatedAt: 'asc' }],
      CREATED_AT_DESC: [{ createdAt: 'desc' }],
      CREATED_AT_ASC: [{ createdAt: 'asc' }],
      DATE_PREACHED_DESC: [{ datePreached: 'desc' }],
      DATE_PREACHED_ASC: [{ datePreached: 'asc' }],
    };

    return map[normalized ?? ''] ?? [{ updatedAt: 'desc' }];
  }
}

