import { Global, Module } from '@nestjs/common';
import { MEDIA_STORAGE_TOKEN } from './media-storage.interface';
import { MediaService } from './media.service';
import { S3MediaStorageService } from './s3-media-storage.service';

@Global()
@Module({
  providers: [
    MediaService,
    S3MediaStorageService,
    {
      provide: MEDIA_STORAGE_TOKEN,
      useExisting: S3MediaStorageService,
    },
  ],
  exports: [MediaService, MEDIA_STORAGE_TOKEN],
})
export class MediaModule {}
