import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ListeningHistoryDto, SaveSermonDto } from './dto/library.dto';

@Injectable()
export class LibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async getOverview(userId: string) {
    const [savedSermons, playlists, listeningHistory, downloads] = await Promise.all([
      this.listSavedSermons(userId),
      this.listPlaylists(userId),
      this.listHistory(userId),
      this.listDownloads(userId),
    ]);

    return {
      savedSermons: savedSermons.items,
      playlists: playlists.items,
      listeningHistory: listeningHistory.items,
      downloads: downloads.items,
    };
  }

  async saveSermon(userId: string, dto: SaveSermonDto) {
    await this.prisma.savedSermon.upsert({
      where: {
        userId_sermonId: {
          userId,
          sermonId: dto.sermonId,
        },
      },
      create: {
        userId,
        sermonId: dto.sermonId,
      },
      update: {},
    });

    return { ok: true };
  }

  async removeSavedSermon(userId: string, sermonId: string) {
    await this.prisma.savedSermon.deleteMany({
      where: { userId, sermonId },
    });

    return { ok: true };
  }

  async addListeningHistory(userId: string, dto: ListeningHistoryDto) {
    await this.prisma.listeningHistory.create({
      data: {
        userId,
        sermonId: dto.sermonId,
        progressSeconds: dto.progressSeconds,
        completed: dto.completed,
      },
    });

    return { ok: true };
  }

  async listSavedSermons(userId: string) {
    const items = await this.prisma.savedSermon.findMany({
      where: { userId, sermon: { status: 'PUBLISHED', deletedAt: null } },
      include: {
        sermon: {
          include: {
            preacher: { select: { id: true, displayName: true, slug: true, profileImageUrl: true } },
            program: { select: { id: true, name: true, slug: true, coverImage: true, year: true } },
            session: { select: { id: true, name: true, slug: true } },
            topics: { include: { topic: { select: { id: true, name: true, slug: true } } } },
            mediaAssets: {
              where: { type: 'PROCESSED_AUDIO', status: 'PUBLISHED' },
              select: { id: true, cdnUrl: true, durationSeconds: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: items.map((entry) => this.toSermonSummary(entry.sermon)),
    };
  }

  async listHistory(userId: string) {
    const items = await this.prisma.listeningHistory.findMany({
      where: {
        userId,
        sermon: { status: 'PUBLISHED', deletedAt: null },
      },
      include: {
        sermon: {
          include: {
            preacher: { select: { id: true, displayName: true, slug: true, profileImageUrl: true } },
            program: { select: { id: true, name: true, slug: true, coverImage: true, year: true } },
            session: { select: { id: true, name: true, slug: true } },
            topics: { include: { topic: { select: { id: true, name: true, slug: true } } } },
            mediaAssets: {
              where: { type: 'PROCESSED_AUDIO', status: 'PUBLISHED' },
              select: { id: true, cdnUrl: true, durationSeconds: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { listenedAt: 'desc' },
      take: 25,
    });

    return {
      items: items.map((entry) => ({
        historyId: entry.id,
        progressSeconds: entry.progressSeconds,
        completed: entry.completed,
        listenedAt: entry.listenedAt,
        ...this.toSermonSummary(entry.sermon),
      })),
    };
  }

  async listDownloads(userId: string) {
    const entitlementSummary = await this.subscriptionsService.getEntitlementSummary(userId);
    if (!entitlementSummary.downloadAccess) {
      return { items: [] };
    }

    const sourceItems = await this.prisma.savedSermon.findMany({
      where: { userId, sermon: { status: 'PUBLISHED', deletedAt: null } },
      include: {
        sermon: {
          include: {
            preacher: { select: { id: true, displayName: true, slug: true, profileImageUrl: true } },
            program: { select: { id: true, name: true, slug: true, coverImage: true, year: true } },
            session: { select: { id: true, name: true, slug: true } },
            topics: { include: { topic: { select: { id: true, name: true, slug: true } } } },
            mediaAssets: {
              where: { type: 'PROCESSED_AUDIO', status: 'PUBLISHED' },
              select: { id: true, cdnUrl: true, durationSeconds: true },
              take: 1,
            },
          },
        },
      },
      take: 25,
      orderBy: { createdAt: 'desc' },
    });

    const items = await Promise.all(
      sourceItems.map(async (entry) => {
        const assetId = entry.sermon.mediaAssets[0]?.id;
        return {
          ...this.toSermonSummary(entry.sermon),
          downloadUrl: assetId ? await this.mediaService.getPlaybackUrl(assetId) : null,
        };
      }),
    );

    return { items };
  }

  private async listPlaylists(userId: string) {
    const items = await this.prisma.playlist.findMany({
      where: { userId, deletedAt: null },
      include: {
        user: { select: { id: true, displayName: true } },
        sermons: { select: { sermonId: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    return {
      items: items.map((playlist) => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        sermonCount: playlist.sermons.length,
        owner: playlist.user,
        isPrivate: !playlist.isPublic,
        updatedAt: playlist.updatedAt,
      })),
    };
  }

  private toSermonSummary(sermon: {
    id: string;
    title: string;
    description: string | null;
    churchName: string | null;
    datePreached: Date | null;
    durationSeconds: number | null;
    publishedAt: Date | null;
    preacher: { id: string; displayName: string; slug: string; profileImageUrl: string | null } | null;
    program: { id: string; name: string; slug: string; coverImage: string | null; year: number | null } | null;
    session: { id: string; name: string; slug: string } | null;
    topics: Array<{ topic: { id: string; name: string; slug: string } }>;
    mediaAssets: Array<{ id: string; cdnUrl: string | null; durationSeconds: number | null }>;
  }) {
    const audioAsset = sermon.mediaAssets[0];
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
      playbackUrl: audioAsset?.cdnUrl ?? null,
    };
  }
}
