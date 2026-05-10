import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SermonSpeakerRole, UploadJobSource, UploadJobStatus } from '@prisma/client';
import { appConstants } from '@wordcast/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { toSlug } from '../../common/utils/slug.util';
import { AuditService } from '../audit/audit.service';
import { MediaService } from '../media/media.service';
import { QueueService } from '../queues/queue.service';
import {
  type GoogleDriveUploadDto, ManualUploadDto, ManualUploadPresignDto, SocialImportDto, YoutubeUploadDto,
} from './dto/upload-job.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

type UploadedAudioFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const IMPORT_SOCIAL_SERMON = 'IMPORT_SOCIAL_SERMON' as unknown as UploadJobSource;
const PENDING_STATUS = 'PENDING' as unknown as UploadJobStatus;

@Injectable()
export class UploadJobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly auditService: AuditService,
    private readonly mediaService: MediaService,
  ) {}

  async createManualUpload(
    dto: ManualUploadDto,
    file: UploadedAudioFile,
    actor: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }
    if (!file.buffer) {
      throw new BadRequestException('Expected in-memory upload payload');
    }

    this.assertManualUploadConstraints(file.mimetype, file.size);

    const result = await this.createManualUploadRecords(
      ({
        title: dto.title,
        preacherId: dto.preacherId,
        programId: dto.programId,
        sessionId: dto.sessionId,
        churchName: dto.churchName,
        datePreached: dto.datePreached,
        language: dto.language,
        speakerRole: dto.speakerRole,
        notes: dto.notes,
      }) as ManualUploadDto,
      {
        fileName: file.originalname,
        contentType: file.mimetype,
        sizeBytes: file.size,
        metadata: { uploadMode: 'api-multipart' },
      },
      actor,
    );

    try {
      const uploaded = await this.mediaService.uploadObject({
        key: result.objectKey,
        body: file.buffer,
        contentType: file.mimetype,
      });

      await this.prisma.mediaAsset.update({
        where: { id: result.mediaAsset.id },
        data: {
          objectKey: uploaded.key,
          cdnUrl: uploaded.url ?? null,
          status: 'UPLOADED',
        },
      });
    } catch (error) {
      await this.prisma.uploadJob.updateMany({
        where: { id: result.uploadJob.id },
        data: {
          status: UploadJobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'S3 upload failed',
        },
      });
      throw new BadRequestException('Failed to upload file to object storage');
    }

    await this.queueService.enqueueMediaProcessing({
      uploadJobId: result.uploadJob.id,
      sermonId: result.sermon.id,
      source: 'manual',
      objectKey: result.objectKey,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'upload.manage.manual',
      entityType: 'UploadJob',
      entityId: result.uploadJob.id,
      metadata: {
        sermonId: result.sermon.id,
        fileName: file.originalname,
        objectKey: result.objectKey,
      },
    });

    return {
      sermon: result.sermon,
      uploadJob: result.uploadJob,
      mediaAsset: result.mediaAsset,
    };
  }

  async createManualUploadPresign(dto: ManualUploadPresignDto, actor: AuthenticatedUser) {
    this.assertManualUploadConstraints(dto.contentType, dto.sizeBytes);

    const result = await this.createManualUploadRecords(
      ({
        title: dto.title,
        preacherId: dto.preacherId,
        programId: dto.programId,
        sessionId: dto.sessionId,
        churchName: dto.churchName,
        datePreached: dto.datePreached,
        language: dto.language,
        speakerRole: dto.speakerRole,
        notes: dto.notes,
      }) as ManualUploadDto,
      {
        fileName: dto.fileName,
        contentType: dto.contentType,
        sizeBytes: dto.sizeBytes,
        metadata: { uploadMode: 's3-presigned-put' },
      },
      actor,
    );

    const presign = await this.mediaService.createSignedUploadUrl({
      key: result.objectKey,
      contentType: dto.contentType,
      expiresInSeconds: 900,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'upload.manage.manual.presign',
      entityType: 'UploadJob',
      entityId: result.uploadJob.id,
      metadata: {
        sermonId: result.sermon.id,
        fileName: dto.fileName,
        objectKey: result.objectKey,
      },
    });

    return {
      sermon: result.sermon,
      uploadJob: result.uploadJob,
      upload: {
        key: presign.key,
        url: presign.url,
        method: 'PUT',
        headers: presign.headers,
        expiresInSeconds: 900,
      },
      completeEndpoint: `/admin/uploads/manual/${result.uploadJob.id}/complete`,
    };
  }

  async completeManualUpload(uploadJobId: string, actor: AuthenticatedUser) {
    const uploadJob = await this.prisma.uploadJob.findFirst({
      where: { id: uploadJobId, source: UploadJobSource.MANUAL },
      include: {
        sermon: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!uploadJob) {
      throw new NotFoundException('Upload job not found');
    }

    const statusUpdate = await this.prisma.uploadJob.updateMany({
      where: {
        id: uploadJobId,
        status: UploadJobStatus.ACCEPTED,
      },
      data: {
        status: UploadJobStatus.QUARANTINE,
      },
    });

    if (statusUpdate.count > 0) {
      await this.queueService.enqueueMediaProcessing({
        uploadJobId: uploadJob.id,
        sermonId: uploadJob.sermonId,
        source: 'manual',
      });
    }

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'upload.manage.manual.complete',
      entityType: 'UploadJob',
      entityId: uploadJob.id,
      metadata: {
        sermonId: uploadJob.sermonId,
        queued: statusUpdate.count > 0,
      },
    });

    return {
      success: true,
      queued: statusUpdate.count > 0,
      status: statusUpdate.count > 0 ? UploadJobStatus.QUARANTINE : uploadJob.status,
    };
  }

  async createYoutubeImport(dto: YoutubeUploadDto, actor: AuthenticatedUser) {
    const sermonSlug = await this.uniqueSermonSlug(toSlug(dto.title));

    const { sermon, uploadJob } = await this.prisma.$transaction(async (tx) => {
      const sermon = await tx.sermon.create({
        data: {
          title: dto.title,
          slug: sermonSlug,
          preacherId: dto.preacherId,
          programId: dto.programId ?? null,
          sessionId: dto.sessionId ?? null,
          churchName: dto.churchName ?? null,
          datePreached: dto.datePreached ? new Date(dto.datePreached) : null,
          description: dto.notes ?? null,
          status: 'PROCESSING',
          sourceType: 'YOUTUBE_IMPORT',
          sourceUrl: dto.youtubeUrl,
          createdById: actor.id,
        },
      });

      const uploadJob = await tx.uploadJob.create({
        data: {
          sermonId: sermon.id,
          requestedById: actor.id,
          source: UploadJobSource.YOUTUBE,
          sourceUrl: dto.youtubeUrl,
          status: UploadJobStatus.ACCEPTED,
          metadata: {
            importMode: 'youtube',
          },
        },
      });

      return { sermon, uploadJob };
    });

    await this.queueService.enqueueMediaProcessing({
      uploadJobId: uploadJob.id,
      sermonId: sermon.id,
      source: 'youtube',
      sourceUrl: dto.youtubeUrl,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'upload.manage.youtube',
      entityType: 'UploadJob',
      entityId: uploadJob.id,
      metadata: {
        sermonId: sermon.id,
        sourceUrl: dto.youtubeUrl,
      },
    });

    return { sermon, uploadJob };
  }

  async createGoogleDriveImport(dto: GoogleDriveUploadDto, actor: AuthenticatedUser) {
    const uploadJob = await this.prisma.uploadJob.create({
      data: {
        requestedById: actor.id,
        source: UploadJobSource.GOOGLE_DRIVE,
        sourceUrl: dto.folderUrl,
        status: UploadJobStatus.ACCEPTED,
        metadata: {
          importLabel: dto.importLabel,
          mode: 'bulk-folder',
          defaults: {
            preacherId: dto.defaultPreacherId,
            programId: dto.defaultProgramId,
            sessionId: dto.defaultSessionId,
            churchName: dto.defaultChurchName,
            datePreached: dto.defaultDatePreached,
          },
        },
      },
    });

    await this.queueService.enqueueMediaProcessing({
      uploadJobId: uploadJob.id,
      source: 'google-drive',
      folderUrl: dto.folderUrl,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'upload.manage.google_drive',
      entityType: 'UploadJob',
      entityId: uploadJob.id,
      metadata: {
        folderUrl: dto.folderUrl,
      },
    });

    return uploadJob;
  }

  async createSocialImport(dto: SocialImportDto, actor: AuthenticatedUser) {
    const platform = this.detectSocialPlatform(dto.sourceUrl);
    if (!platform) {
      throw new BadRequestException('Unsupported social media URL');
    }

    const sermonSlug = await this.uniqueSermonSlug('imported-sermon');
    const { sermon, uploadJob } = await this.prisma.$transaction(async (tx) => {
      const sermon = await tx.sermon.create({
        data: {
          title: `Imported sermon (${platform})`,
          slug: sermonSlug,
          preacherId: dto.preacher,
          status: 'PROCESSING',
          sourceType: 'EXTERNAL_LINK',
          sourceUrl: dto.sourceUrl,
          description: dto.notes ?? null,
          createdById: actor.id,
        },
      });

      const uploadJob = await tx.uploadJob.create({
        data: {
          sermonId: sermon.id,
          requestedById: actor.id,
          source: IMPORT_SOCIAL_SERMON,
          sourceUrl: dto.sourceUrl,
          status: PENDING_STATUS,
          metadata: {
            platform,
            notes: dto.notes,
          },
        },
      });

      return { sermon, uploadJob };
    });

    await this.queueService.enqueueMediaIngestion({
      uploadJobId: uploadJob.id,
      sermonId: sermon.id,
      sourceUrl: dto.sourceUrl,
      platform,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'upload.manage.social_import',
      entityType: 'UploadJob',
      entityId: uploadJob.id,
      metadata: {
        sermonId: sermon.id,
        sourceUrl: dto.sourceUrl,
        platform,
      },
    });

    return { sermon, uploadJob };
  }

  async list(
    query: PaginationQueryDto,
    status?: UploadJobStatus,
    source?: UploadJobSource,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const skip = (query.page - 1) * query.pageSize;
    const where = {
      ...(status ? { status } : {}),
      ...(source ? { source } : {}),
      ...this.toCreatedAtRange(dateFrom, dateTo),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.uploadJob.findMany({
        where,
        skip,
        take: query.pageSize,
        include: {
          sermon: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          requestedBy: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.uploadJob.count({ where }),
    ]);

    return {
      items: items.map((job) => ({
        ...job,
        ...this.getJobPresentation(job),
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
    const job = await this.prisma.uploadJob.findFirst({
      where: { id },
      include: {
        sermon: { select: { id: true, title: true, status: true } },
        requestedBy: { select: { id: true, displayName: true, email: true } },
      },
    });

    if (!job) {
      throw new NotFoundException('Upload job not found');
    }

    return {
      ...job,
      ...this.getJobPresentation(job),
    };
  }

  async retry(id: string, actor: AuthenticatedUser) {
    const job = await this.prisma.uploadJob.findFirst({
      where: { id },
      include: {
        sermon: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Upload job not found');
    }

    if (job.status !== UploadJobStatus.FAILED) {
      throw new BadRequestException('Only failed upload jobs can be retried');
    }

    const metadata = this.asRecord(job.metadata);

    if (job.source === UploadJobSource.MANUAL && !job.sermonId) {
      throw new BadRequestException('Manual upload job is missing sermon linkage');
    }

    if (job.source === UploadJobSource.YOUTUBE && (!job.sermonId || !job.sourceUrl)) {
      throw new BadRequestException('YouTube upload job is missing source metadata');
    }

    if (job.source === UploadJobSource.GOOGLE_DRIVE && !job.sourceUrl) {
      throw new BadRequestException('Google Drive upload job is missing folder URL');
    }

    const platform = typeof metadata?.platform === 'string' ? metadata.platform : undefined;
    if (job.source === IMPORT_SOCIAL_SERMON && (!job.sermonId || !job.sourceUrl || !platform)) {
      throw new BadRequestException('Social import job is missing ingestion metadata');
    }

    const nextStatus =
      job.source === IMPORT_SOCIAL_SERMON
        ? PENDING_STATUS
        : UploadJobStatus.ACCEPTED;

    await this.prisma.uploadJob.update({
      where: { id },
      data: {
        status: nextStatus,
        errorMessage: null,
        metadata: this.mergeMetadata(job.metadata, {
          retriedAt: new Date().toISOString(),
          retriedById: actor.id,
        }),
      },
    });

    if (job.source === UploadJobSource.MANUAL) {
      await this.queueService.enqueueMediaProcessing({
        uploadJobId: job.id,
        sermonId: job.sermonId,
        source: 'manual',
      });
    } else if (job.source === UploadJobSource.YOUTUBE) {
      await this.queueService.enqueueMediaProcessing({
        uploadJobId: job.id,
        sermonId: job.sermonId,
        source: 'youtube',
        sourceUrl: job.sourceUrl,
      });
    } else if (job.source === UploadJobSource.GOOGLE_DRIVE) {
      await this.queueService.enqueueMediaProcessing({
        uploadJobId: job.id,
        source: 'google-drive',
        folderUrl: job.sourceUrl,
      });
    } else if (job.source === IMPORT_SOCIAL_SERMON) {
      await this.queueService.enqueueMediaIngestion({
        uploadJobId: job.id,
        sermonId: job.sermonId,
        sourceUrl: job.sourceUrl,
        platform,
      });
    }

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'upload.manage.retry',
      entityType: 'UploadJob',
      entityId: job.id,
      metadata: {
        sermonId: job.sermonId,
        source: job.source,
      },
    });

    return {
      ok: true,
      status: nextStatus,
    };
  }

  private async createManualUploadRecords(
    dto: ManualUploadDto,
    upload: {
      fileName: string;
      contentType: string;
      sizeBytes: number;
      metadata?: Record<string, unknown>;
    },
    actor: AuthenticatedUser,
  ) {
    const sermonSlug = await this.uniqueSermonSlug(toSlug(dto.title));
    const speakerRole: SermonSpeakerRole = dto.speakerRole &&
      ['LEAD_PASTOR', 'GUEST_MINISTER', 'EVANGELIST', 'TEACHER', 'PROPHET', 'APOSTLE', 'OTHER'].includes(
        dto.speakerRole,
      )
        ? (dto.speakerRole as SermonSpeakerRole)
        : 'OTHER';

    return this.prisma.$transaction(async (tx) => {
      const sermon = await tx.sermon.create({
        data: {
          title: dto.title,
          slug: sermonSlug,
          preacherId: dto.preacherId,
          programId: dto.programId ?? null,
          sessionId: dto.sessionId ?? null,
          churchName: dto.churchName ?? null,
          datePreached: dto.datePreached ? new Date(dto.datePreached) : null,
          language: dto.language ?? 'en',
          speakerRole,
          description: dto.notes ?? null,
          status: 'PROCESSING',
          sourceType: 'MANUAL_UPLOAD',
          createdById: actor.id,
        },
      });

      const objectKey = this.buildManualObjectKey(sermon.id, upload.fileName);

      const uploadJob = await tx.uploadJob.create({
        data: {
          sermonId: sermon.id,
          requestedById: actor.id,
          source: UploadJobSource.MANUAL,
          fileName: upload.fileName,
          mimeType: upload.contentType,
          sizeBytes: BigInt(upload.sizeBytes),
          status: UploadJobStatus.ACCEPTED,
          metadata: {
            filename: upload.fileName,
            objectKey,
            ...upload.metadata,
          },
        },
      });

      const mediaAsset = await tx.mediaAsset.create({
        data: {
          sermonId: sermon.id,
          uploadJobId: uploadJob.id,
          type: 'ORIGINAL_AUDIO',
          status: 'UPLOADED',
          originalFileName: upload.fileName,
          mimeType: upload.contentType,
          sizeBytes: BigInt(upload.sizeBytes),
          objectKey,
          metadata: {
            transport: 's3',
            state: 'awaiting-processing',
            ...upload.metadata,
          },
        },
      });

      return { sermon, uploadJob, mediaAsset, objectKey };
    });
  }

  private assertManualUploadConstraints(contentType: string, sizeBytes: number) {
    const allowedMimeTypes = appConstants.acceptedAudioMimeTypes as readonly string[];
    if (!allowedMimeTypes.includes(contentType)) {
      throw new BadRequestException('Unsupported audio format');
    }

    if (sizeBytes > appConstants.maxAudioUploadBytes) {
      throw new BadRequestException('File too large');
    }
  }

  private buildManualObjectKey(sermonId: string, fileName: string): string {
    const extensionMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
    const extension = extensionMatch?.[1]?.toLowerCase() ?? 'bin';
    return `sermons/${sermonId}/audio/raw/${randomUUID()}.${extension}`;
  }

  private async uniqueSermonSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug || 'sermon';
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

  private detectSocialPlatform(url: string):
    | 'YOUTUBE'
    | 'INSTAGRAM'
    | 'FACEBOOK'
    | 'TIKTOK'
    | 'X'
    | null {
    const lower = url.toLowerCase();

    if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      return 'YOUTUBE';
    }
    if (lower.includes('instagram.com')) {
      return 'INSTAGRAM';
    }
    if (lower.includes('facebook.com') || lower.includes('fb.watch')) {
      return 'FACEBOOK';
    }
    if (lower.includes('tiktok.com')) {
      return 'TIKTOK';
    }
    if (lower.includes('x.com') || lower.includes('twitter.com')) {
      return 'X';
    }

    return null;
  }

  private toCreatedAtRange(dateFrom?: string, dateTo?: string) {
    const createdAt: { gte?: Date; lte?: Date } = {};

    if (dateFrom) {
      createdAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }

    return Object.keys(createdAt).length ? { createdAt } : {};
  }

  private getJobPresentation(job: {
    source: UploadJobSource;
    status: UploadJobStatus;
    sermon: { id: string; title: string; status: string } | null;
    metadata: unknown;
  }) {
    const metadata = this.asRecord(job.metadata);
    const itemResults = this.extractItemResults(metadata);
    const failedItems = this.extractFailedItems(metadata, itemResults);
    const counters = this.extractCounters(metadata, itemResults, failedItems);

    return {
      ...counters,
      itemResults,
      failedItems,
      linkedSermons: job.sermon ? [job.sermon] : [],
      canRetry: job.status === UploadJobStatus.FAILED,
    };
  }

  private extractCounters(
    metadata: Record<string, unknown> | null,
    itemResults: Array<Record<string, unknown>>,
    failedItems: Array<Record<string, unknown>>,
  ) {
    const counts = this.asRecord(metadata?.counts);
    const totals = this.asRecord(metadata?.totals);

    const totalItems =
      this.toNumber(metadata?.totalItems) ??
      this.toNumber(counts?.total) ??
      this.toNumber(totals?.total) ??
      (itemResults.length > 0 ? itemResults.length : failedItems.length > 0 ? failedItems.length : 1);

    const failedCount =
      this.toNumber(metadata?.failedItems) ??
      this.toNumber(counts?.failed) ??
      this.toNumber(totals?.failed) ??
      failedItems.length;

    const processedItems =
      this.toNumber(metadata?.processedItems) ??
      this.toNumber(counts?.processed) ??
      this.toNumber(totals?.processed) ??
      Math.max(totalItems - failedCount, 0);

    return {
      totalItems,
      processedItems,
      failedItemsCount: failedCount,
    };
  }

  private extractItemResults(metadata: Record<string, unknown> | null) {
    const candidates = [metadata?.itemResults, metadata?.results, metadata?.items];
    for (const candidate of candidates) {
      const normalized = this.asObjectArray(candidate);
      if (normalized.length) {
        return normalized;
      }
    }
    return [];
  }

  private extractFailedItems(
    metadata: Record<string, unknown> | null,
    itemResults: Array<Record<string, unknown>>,
  ) {
    const direct = this.asObjectArray(metadata?.failedItems ?? metadata?.failedEntries ?? metadata?.errors);
    if (direct.length) {
      return direct;
    }

    return itemResults.filter((entry) => {
      const status = typeof entry.status === 'string' ? entry.status.toUpperCase() : '';
      return status === 'FAILED' || status === 'ERROR';
    });
  }

  private mergeMetadata(existing: unknown, next: Record<string, unknown>) {
    const base = this.asRecord(existing) ?? {};
    return {
      ...base,
      ...next,
    } as Prisma.InputJsonValue;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private asObjectArray(value: unknown): Array<Record<string, unknown>> {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
    );
  }

  private toNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }
}
