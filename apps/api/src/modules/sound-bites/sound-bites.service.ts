import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SoundBitesQueryDto } from './dto/sound-bites-query.dto';

@Injectable()
export class SoundBitesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: SoundBitesQueryDto) {
    const skip = (query.page - 1) * query.pageSize;

    const where: Prisma.SoundBiteWhereInput = {
      status: 'PUBLISHED' as const,
      deletedAt: null,
      sermon: {
        status: 'PUBLISHED' as const,
        deletedAt: null,
      },
      ...(query.sermonId ? { sermonId: query.sermonId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.soundBite.findMany({
        where,
        skip,
        take: query.pageSize,
        include: {
          sermon: {
            select: {
              id: true,
              title: true,
              preacher: {
                select: {
                  id: true,
                  displayName: true,
                  profileImageUrl: true,
                },
              },
            },
          },
          clipAsset: {
            select: {
              id: true,
              cdnUrl: true,
              durationSeconds: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.soundBite.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        quoteText: item.quoteText,
        startSeconds: item.startSeconds,
        endSeconds: item.endSeconds,
        preacher: item.sermon?.preacher
          ? {
              id: item.sermon.preacher.id,
              displayName: item.sermon.preacher.displayName,
              profileImageUrl: item.sermon.preacher.profileImageUrl ?? null,
            }
          : null,
        sermon: item.sermon
          ? {
              id: item.sermon.id,
              title: item.sermon.title,
            }
          : null,
        playbackUrl: item.clipAsset?.cdnUrl ?? null,
        durationSeconds: item.clipAsset?.durationSeconds ?? null,
      })),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async getById(id: string) {
    const soundBite = await this.prisma.soundBite.findFirst({
      where: { id, status: 'PUBLISHED', deletedAt: null },
      include: {
        sermon: {
          select: {
            id: true,
            title: true,
            preacher: {
              select: {
                id: true,
                displayName: true,
                profileImageUrl: true,
              },
            },
          },
        },
        clipAsset: {
          select: { cdnUrl: true, durationSeconds: true },
        },
      },
    });

    if (!soundBite) {
      throw new NotFoundException('Sound bite not found');
    }

    return {
      id: soundBite.id,
      title: soundBite.title,
      quoteText: soundBite.quoteText,
      startSeconds: soundBite.startSeconds,
      endSeconds: soundBite.endSeconds,
      sermon: soundBite.sermon,
      preacher: soundBite.sermon?.preacher
        ? {
            id: soundBite.sermon.preacher.id,
            displayName: soundBite.sermon.preacher.displayName,
            profileImageUrl: soundBite.sermon.preacher.profileImageUrl ?? null,
          }
        : null,
      playbackUrl: soundBite.clipAsset?.cdnUrl ?? null,
      durationSeconds: soundBite.clipAsset?.durationSeconds ?? null,
    };
  }

  async recordPlay(id: string) {
    const soundBite = await this.prisma.soundBite.findFirst({
      where: { id, status: 'PUBLISHED', deletedAt: null },
    });
    if (!soundBite) {
      throw new NotFoundException('Sound bite not found');
    }
    return { ok: true };
  }

  async recordShare(id: string) {
    const soundBite = await this.prisma.soundBite.findFirst({
      where: { id, status: 'PUBLISHED', deletedAt: null },
    });
    if (!soundBite) {
      throw new NotFoundException('Sound bite not found');
    }
    return { ok: true };
  }
}
