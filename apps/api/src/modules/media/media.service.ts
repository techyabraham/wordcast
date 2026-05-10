import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MEDIA_STORAGE_TOKEN, MediaStorageProvider, SignedUploadUrlInput, UploadObjectInput,
} from './media-storage.interface';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MEDIA_STORAGE_TOKEN) private readonly storage: MediaStorageProvider,
  ) {}

  async createAssetRecord(input: {
    sermonId?: string;
    uploadJobId?: string;
    type:
      | 'ORIGINAL_AUDIO'
      | 'PROCESSED_AUDIO'
      | 'HLS_MANIFEST'
      | 'HLS_SEGMENT'
      | 'SOUND_BITE_CLIP'
      | 'WAVEFORM'
      | 'COVER_IMAGE'
      | 'TRANSCRIPT_FILE';
    status?: 'UPLOADED' | 'QUARANTINE' | 'VALIDATED' | 'PROCESSED' | 'PUBLISHED' | 'FAILED';
    objectKey?: string;
    cdnUrl?: string;
    mimeType?: string;
    sizeBytes?: bigint;
    durationSeconds?: number;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.mediaAsset.create({
      data: {
        type: input.type,
        status: input.status ?? 'UPLOADED',
        ...(input.sermonId !== undefined ? { sermonId: input.sermonId } : {}),
        ...(input.uploadJobId !== undefined ? { uploadJobId: input.uploadJobId } : {}),
        ...(input.objectKey !== undefined ? { objectKey: input.objectKey } : {}),
        ...(input.cdnUrl !== undefined ? { cdnUrl: input.cdnUrl } : {}),
        ...(input.mimeType !== undefined ? { mimeType: input.mimeType } : {}),
        ...(input.sizeBytes !== undefined ? { sizeBytes: input.sizeBytes } : {}),
        ...(input.durationSeconds !== undefined ? { durationSeconds: input.durationSeconds } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata as Prisma.InputJsonValue } : {}),
      } satisfies Prisma.MediaAssetUncheckedCreateInput,
    });
  }

  async uploadObject(input: UploadObjectInput) {
    return this.storage.putObject(input);
  }

  async createSignedUploadUrl(input: SignedUploadUrlInput) {
    return this.storage.createSignedUploadUrl(input);
  }

  async getPlaybackUrl(assetId: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return null;
    }

    if (asset.storageProvider === 'r2' && asset.cdnUrl) {
      return asset.cdnUrl;
    }

    if (!asset.objectKey) {
      return asset.cdnUrl ?? null;
    }

    return this.storage.getSignedUrl(asset.objectKey);
  }
}
