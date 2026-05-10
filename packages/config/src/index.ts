import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  TYPESENSE_HOST: z.string().min(1),
  TYPESENSE_PORT: z.coerce.number().int().positive().default(8108),
  TYPESENSE_PROTOCOL: z.enum(['http', 'https']).default('http'),
  TYPESENSE_API_KEY: z.string().min(1),
  PAYSTACK_SECRET_KEY: z.string().min(1),
  PAYSTACK_WEBHOOK_SECRET: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  ADMIN_DASHBOARD_URL: z.string().default('http://localhost:3000'),
  API_BASE_URL: z.string().default('http://localhost:4000/api/v1'),
});

export type AppEnv = z.infer<typeof envSchema>;

export const parseEnv = (input: NodeJS.ProcessEnv): AppEnv => envSchema.parse(input);

export const appConstants = {
  apiPrefix: 'api/v1',
  maxAudioUploadBytes: 1024 * 1024 * 1024,
  acceptedAudioMimeTypes: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/aac',
    'audio/flac',
    'audio/ogg',
  ],
  accessTokenCookie: 'wc_at',
  refreshTokenCookie: 'wc_rt',
} as const;
