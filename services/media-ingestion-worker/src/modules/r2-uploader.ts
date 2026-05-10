import { createReadStream } from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
}

export class R2Uploader {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(config: R2Config) {
    this.bucket = config.bucket;
    this.publicUrl = config.publicUrl.replace(/\/$/, '');
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async uploadAudio(params: { filePath: string; key: string; contentType: string }) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: createReadStream(params.filePath),
        ContentType: params.contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return {
      key: params.key,
      url: `${this.publicUrl}/${params.key}`,
    };
  }
}
