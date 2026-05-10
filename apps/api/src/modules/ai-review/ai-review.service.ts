import { Injectable, NotFoundException } from '@nestjs/common';
import { AIMetadataStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AuditService } from '../audit/audit.service';
import { ApproveAiReviewDto, RejectAiReviewDto } from './dto/ai-review.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class AiReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listPending(query: PaginationQueryDto, status?: string) {
    const skip = (query.page - 1) * query.pageSize;

    const statusFilter: Prisma.SermonAIMetadataWhereInput = status
      ? { status: status as AIMetadataStatus }
      : {
          status: {
            in: [AIMetadataStatus.GENERATED, AIMetadataStatus.REVIEWED],
          },
        };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.sermonAIMetadata.findMany({
        where: statusFilter,
        skip,
        take: query.pageSize,
        include: {
          sermon: {
            select: {
              id: true,
              title: true,
              status: true,
              preacher: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sermonAIMetadata.count({
        where: statusFilter,
      }),
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

  async getDetail(sermonId: string) {
    const aiMetadata = await this.prisma.sermonAIMetadata.findFirst({
      where: { sermonId },
      orderBy: { createdAt: 'desc' },
    });

    if (!aiMetadata) {
      throw new NotFoundException('AI metadata not found for sermon');
    }

    const sermon = await this.prisma.sermon.findFirst({
      where: { id: sermonId },
      select: {
        id: true,
        title: true,
        status: true,
        transcript: true,
        description: true,
        preacher: { select: { id: true, displayName: true } },
        topics: { include: { topic: true } },
      },
    });

    if (!sermon) {
      throw new NotFoundException('Sermon not found');
    }

    const topicSuggestions = await this.prisma.topicSuggestion.findMany({
      where: { sermonId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });

    return {
      sermon: {
        ...sermon,
        topics: sermon.topics.map((entry) => entry.topic),
      },
      aiMetadata,
      topicSuggestions,
    };
  }

  async approve(sermonId: string, dto: ApproveAiReviewDto, actor: AuthenticatedUser) {
    const aiMetadata = await this.prisma.sermonAIMetadata.findFirst({
      where: { sermonId },
      orderBy: { createdAt: 'desc' },
    });

    if (!aiMetadata) {
      throw new NotFoundException('AI metadata not found for sermon');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.topicIds) {
        await tx.sermonTopic.deleteMany({ where: { sermonId } });
        await tx.sermonTopic.createMany({
          data: dto.topicIds.map((topicId) => ({ sermonId, topicId })),
          skipDuplicates: true,
        });
      }

      await tx.sermonAIMetadata.update({
        where: { id: aiMetadata.id },
        data: {
          status: 'APPROVED',
          reviewedById: actor.id,
          reviewedAt: new Date(),
          reviewNotes: 'Approved by staff/admin reviewer',
        },
      });

      return tx.sermon.update({
        where: { id: sermonId },
        data: {
          transcript: dto.editedTranscript ?? aiMetadata.transcript,
          description: dto.editedDescription ?? aiMetadata.generatedDescription,
          status: 'REVIEW_PENDING',
        },
      });
    });

    await this.prisma.topicSuggestion.updateMany({
      where: { sermonId, status: 'PENDING' },
      data: {
        status: 'APPROVED',
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'ai.review.approve',
      entityType: 'Sermon',
      entityId: sermonId,
      metadata: { aiMetadataId: aiMetadata.id },
    });

    return updated;
  }

  async reject(sermonId: string, dto: RejectAiReviewDto, actor: AuthenticatedUser) {
    const aiMetadata = await this.prisma.sermonAIMetadata.findFirst({
      where: { sermonId },
      orderBy: { createdAt: 'desc' },
    });

    if (!aiMetadata) {
      throw new NotFoundException('AI metadata not found for sermon');
    }

    await this.prisma.$transaction([
      this.prisma.sermonAIMetadata.update({
        where: { id: aiMetadata.id },
        data: {
          status: 'REJECTED',
          reviewedById: actor.id,
          reviewedAt: new Date(),
          reviewNotes: dto.notes ?? null,
        },
      }),
      this.prisma.topicSuggestion.updateMany({
        where: { sermonId, status: 'PENDING' },
        data: {
          status: 'REJECTED',
          reviewedById: actor.id,
          reviewedAt: new Date(),
          rejectionReason: dto.notes ?? null,
        },
      }),
      this.prisma.sermon.update({
        where: { id: sermonId },
        data: {
          status: 'DRAFT',
        },
      }),
    ]);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'ai.review.reject',
      entityType: 'Sermon',
      entityId: sermonId,
      metadata: { notes: dto.notes },
    });

    return { success: true };
  }
}
