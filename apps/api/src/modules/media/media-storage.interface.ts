export interface UploadObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface SignedUploadUrlInput {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}

export interface MediaStorageProvider {
  putObject(input: UploadObjectInput): Promise<{ key: string; url?: string }>;
  createSignedUploadUrl(input: SignedUploadUrlInput): Promise<{ key: string; url: string; headers: Record<string, string> }>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

export const MEDIA_STORAGE_TOKEN = Symbol('MEDIA_STORAGE_TOKEN');
