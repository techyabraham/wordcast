import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppEnv } from '@wordcast/config';
import {
  MediaStorageProvider,
  SignedUploadUrlInput,
  UploadObjectInput,
} from './media-storage.interface';

@Injectable()
export class S3MediaStorageService implements MediaStorageProvider {
  private readonly bucket: string;
  private readonly region: string;
  private readonly client: S3Client;

  constructor(private readonly configService: ConfigService<AppEnv>) {
    this.bucket = this.configService.getOrThrow<string>('S3_BUCKET');
    this.region = this.configService.getOrThrow<string>('S3_REGION');
    const accessKeyId = this.configService.getOrThrow<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.getOrThrow<string>('S3_SECRET_ACCESS_KEY');

    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async putObject(input: UploadObjectInput): Promise<{ key: string; url?: string }> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );

    return {
      key: input.key,
      url: this.toObjectUrl(input.key),
    };
  }

  async createSignedUploadUrl(input: SignedUploadUrlInput): Promise<{ key: string; url: string; headers: Record<string, string> }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ContentType: input.contentType,
    });

    const url = await getSignedUrl(this.client, command, {
      expiresIn: input.expiresInSeconds ?? 900,
    });

    return {
      key: input.key,
      url,
      headers: {
        'Content-Type': input.contentType,
      },
    };
  }

  async getSignedUrl(key: string, expiresInSeconds = 900): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  private toObjectUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
