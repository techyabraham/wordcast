import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlaylistDto, AddPlaylistSermonDto, UpdatePlaylistDto } from './dto/playlist.dto';

@Injectable()
export class PlaylistsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePlaylistDto) {
    const playlist = await this.prisma.playlist.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description ?? null,
        isPublic: dto.isPublic ?? false,
      },
      include: {
        user: { select: { id: true, displayName: true } },
        sermons: {
          include: {
            sermon: {
              select: {
                id: true,
                title: true,
                status: true,
                preacher: { select: { id: true, displayName: true, profileImageUrl: true } },
                mediaAssets: {
                  where: { type: 'PROCESSED_AUDIO', status: 'PUBLISHED' },
                  select: { cdnUrl: true },
                  take: 1,
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });
    return this.toPlaylistDetail(playlist);
  }

  async list(userId: string) {
    const items = await this.prisma.playlist.findMany({
      where: { userId, deletedAt: null },
      include: {
        user: { select: { id: true, displayName: true } },
        sermons: {
          include: {
            sermon: {
              select: {
                id: true,
                title: true,
                status: true,
                preacher: { select: { id: true, displayName: true, profileImageUrl: true } },
                mediaAssets: {
                  where: { type: 'PROCESSED_AUDIO', status: 'PUBLISHED' },
                  select: { cdnUrl: true },
                  take: 1,
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: items.map((playlist) => this.toPlaylistSummary(playlist)),
    };
  }

  async getById(userId: string, playlistId: string) {
    const playlist = await this.prisma.playlist.findFirst({
      where: { id: playlistId, userId, deletedAt: null },
      include: {
        user: { select: { id: true, displayName: true } },
        sermons: {
          include: {
            sermon: {
              select: {
                id: true,
                title: true,
                status: true,
                preacher: { select: { id: true, displayName: true, profileImageUrl: true } },
                mediaAssets: {
                  where: { type: 'PROCESSED_AUDIO', status: 'PUBLISHED' },
                  select: { cdnUrl: true },
                  take: 1,
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    return this.toPlaylistDetail(playlist);
  }

  async update(userId: string, playlistId: string, dto: UpdatePlaylistDto) {
    const existing = await this.prisma.playlist.findFirst({ where: { id: playlistId, userId, deletedAt: null } });
    if (!existing) {
      throw new NotFoundException('Playlist not found');
    }

    const playlist = await this.prisma.playlist.update({
      where: { id: playlistId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
        ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
      },
      include: {
        user: { select: { id: true, displayName: true } },
        sermons: {
          include: {
            sermon: {
              select: {
                id: true,
                title: true,
                status: true,
                preacher: { select: { id: true, displayName: true, profileImageUrl: true } },
                mediaAssets: {
                  where: { type: 'PROCESSED_AUDIO', status: 'PUBLISHED' },
                  select: { cdnUrl: true },
                  take: 1,
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    return this.toPlaylistDetail(playlist);
  }

  async remove(userId: string, playlistId: string) {
    const playlist = await this.prisma.playlist.findFirst({ where: { id: playlistId, userId, deletedAt: null } });
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    await this.prisma.playlist.update({
      where: { id: playlistId },
      data: { deletedAt: new Date() },
    });

    return { ok: true };
  }

  async addSermon(userId: string, playlistId: string, dto: AddPlaylistSermonDto) {
    const playlist = await this.prisma.playlist.findFirst({ where: { id: playlistId, userId, deletedAt: null } });
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    const maxPosition = await this.prisma.playlistSermon.aggregate({
      where: { playlistId },
      _max: { position: true },
    });

    await this.prisma.playlistSermon.upsert({
      where: {
        playlistId_sermonId: {
          playlistId,
          sermonId: dto.sermonId,
        },
      },
      create: {
        playlistId,
        sermonId: dto.sermonId,
        position: (maxPosition._max.position ?? 0) + 1,
      },
      update: {},
    });

    return { ok: true };
  }

  async removeSermon(userId: string, playlistId: string, sermonId: string) {
    const playlist = await this.prisma.playlist.findFirst({ where: { id: playlistId, userId, deletedAt: null } });
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    await this.prisma.playlistSermon.deleteMany({
      where: { playlistId, sermonId },
    });

    return { ok: true };
  }

  private toPlaylistSummary(playlist: {
    id: string;
    name: string;
    description: string | null;
    isPublic: boolean;
    updatedAt: Date;
    user: { id: string; displayName: string };
    sermons: Array<unknown>;
  }) {
    return {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      sermonCount: playlist.sermons.length,
      owner: playlist.user,
      isPrivate: !playlist.isPublic,
      updatedAt: playlist.updatedAt,
    };
  }

  private toPlaylistDetail(playlist: {
    id: string;
    name: string;
    description: string | null;
    isPublic: boolean;
    updatedAt: Date;
    user: { id: string; displayName: string };
    sermons: Array<{
      addedAt: Date;
      position: number;
      sermon: {
        id: string;
        title: string;
        status: string;
        preacher: { id: string; displayName: string; profileImageUrl: string | null } | null;
        mediaAssets: Array<{ cdnUrl: string | null }>;
      };
    }>;
  }) {
    return {
      ...this.toPlaylistSummary(playlist),
      sermons: playlist.sermons.map((entry) => ({
        id: entry.sermon.id,
        title: entry.sermon.title,
        status: entry.sermon.status,
        preacher: entry.sermon.preacher
          ? {
              id: entry.sermon.preacher.id,
              displayName: entry.sermon.preacher.displayName,
              profileImageUrl: entry.sermon.preacher.profileImageUrl,
            }
          : null,
        playbackUrl: entry.sermon.mediaAssets[0]?.cdnUrl ?? null,
        addedAt: entry.addedAt,
        position: entry.position,
      })),
    };
  }
}
