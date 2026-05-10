import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class HomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async getHomeFeed(userId?: string) {
    const entitlements = userId ? await this.subscriptionsService.getEntitlementSummary(userId) : null;

    const [
      featuredProgram,
      featuredPrograms,
      featuredPreachers,
      featuredTopics,
      soundBitesPreview,
      trendingSermons,
      newlyAddedSermons,
      continueListening,
    ] = await Promise.all([
      this.prisma.program.findFirst({
        where: { deletedAt: null, sermons: { some: { status: 'PUBLISHED', deletedAt: null } } },
        orderBy: [{ year: 'desc' }, { startDate: 'desc' }, { createdAt: 'desc' }],
        select: { id: true, name: true, slug: true, year: true, coverImage: true },
      }),
      this.prisma.program.findMany({
        where: { deletedAt: null, sermons: { some: { status: 'PUBLISHED', deletedAt: null } } },
        orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
        take: 6,
        select: { id: true, name: true, slug: true, year: true, coverImage: true },
      }),
      this.prisma.preacher.findMany({
        where: { deletedAt: null, sermons: { some: { status: 'PUBLISHED', deletedAt: null } } },
        orderBy: [{ followerCount: 'desc' }, { updatedAt: 'desc' }],
        take: 8,
        select: { id: true, displayName: true, slug: true, profileImageUrl: true },
      }),
      this.prisma.topic.findMany({
        where: { deletedAt: null, isActive: true, sermons: { some: { sermon: { status: 'PUBLISHED', deletedAt: null } } } },
        orderBy: [{ sermons: { _count: 'desc' } }, { updatedAt: 'desc' }],
        take: 8,
        select: { id: true, name: true, slug: true },
      }),
      this.prisma.soundBite.findMany({
        where: { status: 'PUBLISHED', deletedAt: null, sermon: { status: 'PUBLISHED', deletedAt: null } },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          sermon: {
            select: {
              id: true,
              title: true,
              preacher: { select: { id: true, displayName: true, profileImageUrl: true } },
            },
          },
          clipAsset: { select: { cdnUrl: true, durationSeconds: true } },
        },
      }),
      this.prisma.sermon.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        orderBy: [{ playCount: 'desc' }, { publishedAt: 'desc' }],
        take: 8,
        include: this.sermonInclude(),
      }),
      this.prisma.sermon.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: 8,
        include: this.sermonInclude(),
      }),
      userId
        ? this.prisma.listeningHistory.findMany({
            where: { userId, sermon: { status: 'PUBLISHED', deletedAt: null } },
            include: {
              sermon: {
                include: this.sermonInclude(),
              },
            },
            orderBy: { listenedAt: 'desc' },
            take: 8,
          })
        : Promise.resolve([]),
    ]);

    return {
      featuredProgram: featuredProgram
        ? {
            id: featuredProgram.id,
            name: featuredProgram.name,
            slug: featuredProgram.slug,
            year: featuredProgram.year,
            coverImage: featuredProgram.coverImage,
          }
        : null,
      continueListening: continueListening.map((entry) => ({
        historyId: entry.id,
        progressSeconds: entry.progressSeconds,
        completed: entry.completed,
        listenedAt: entry.listenedAt,
        ...this.toSermonSummary(entry.sermon, entitlements),
      })),
      trendingSermons: trendingSermons.map((sermon) => this.toSermonSummary(sermon, entitlements)),
      featuredTopics: featuredTopics.map((topic) => ({
        id: topic.id,
        name: topic.name,
        slug: topic.slug,
      })),
      featuredPrograms: featuredPrograms.map((program) => ({
        id: program.id,
        name: program.name,
        slug: program.slug,
        year: program.year,
        coverImage: program.coverImage,
      })),
      featuredPreachers: featuredPreachers.map((preacher) => ({
        id: preacher.id,
        displayName: preacher.displayName,
        slug: preacher.slug,
        profileImageUrl: preacher.profileImageUrl,
      })),
      soundBitesPreview: soundBitesPreview.map((bite) => ({
        id: bite.id,
        title: bite.title,
        quoteText: bite.quoteText,
        startSeconds: bite.startSeconds,
        endSeconds: bite.endSeconds,
        preacher: bite.sermon?.preacher
          ? {
              id: bite.sermon.preacher.id,
              displayName: bite.sermon.preacher.displayName,
              profileImageUrl: bite.sermon.preacher.profileImageUrl,
            }
          : null,
        sermon: bite.sermon
          ? {
              id: bite.sermon.id,
              title: bite.sermon.title,
            }
          : null,
        playbackUrl: bite.clipAsset?.cdnUrl ?? null,
        durationSeconds: bite.clipAsset?.durationSeconds ?? null,
      })),
      newlyAddedSermons: newlyAddedSermons.map((sermon) => this.toSermonSummary(sermon, entitlements)),
    };
  }

  private sermonInclude() {
    return {
      preacher: { select: { id: true, displayName: true, slug: true, profileImageUrl: true } },
      program: { select: { id: true, name: true, slug: true, coverImage: true, year: true } },
      session: { select: { id: true, name: true, slug: true } },
      topics: { include: { topic: { select: { id: true, name: true, slug: true } } } },
      mediaAssets: {
        where: { type: 'PROCESSED_AUDIO', status: 'PUBLISHED' },
        select: { id: true, cdnUrl: true, durationSeconds: true },
        take: 1,
      },
    } as const;
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
      preacher: { id: string; displayName: string; slug: string; profileImageUrl: string | null } | null;
      program: { id: string; name: string; slug: string; coverImage: string | null; year: number | null } | null;
      session: { id: string; name: string; slug: string } | null;
      topics: Array<{ topic: { id: string; name: string; slug: string } }>;
      mediaAssets: Array<{ cdnUrl: string | null; durationSeconds: number | null }>;
    },
    entitlements?: { transcriptAccess: boolean; downloadAccess: boolean; adFree: boolean; enhancedLinking: boolean } | null,
  ) {
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
}
