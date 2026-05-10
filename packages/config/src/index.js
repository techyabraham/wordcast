"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appConstants = exports.parseEnv = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'staging', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(4000),
    DATABASE_URL: zod_1.z.string().min(1),
    REDIS_URL: zod_1.z.string().min(1),
    JWT_ACCESS_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    ACCESS_TOKEN_TTL: zod_1.z.string().default('15m'),
    REFRESH_TOKEN_TTL_DAYS: zod_1.z.coerce.number().int().positive().default(30),
    TYPESENSE_HOST: zod_1.z.string().min(1),
    TYPESENSE_PORT: zod_1.z.coerce.number().int().positive().default(8108),
    TYPESENSE_PROTOCOL: zod_1.z.enum(['http', 'https']).default('http'),
    TYPESENSE_API_KEY: zod_1.z.string().min(1),
    PAYSTACK_SECRET_KEY: zod_1.z.string().min(1),
    PAYSTACK_WEBHOOK_SECRET: zod_1.z.string().min(1),
    OPENAI_API_KEY: zod_1.z.string().min(1),
    S3_REGION: zod_1.z.string().min(1),
    S3_BUCKET: zod_1.z.string().min(1),
    S3_ACCESS_KEY_ID: zod_1.z.string().min(1),
    S3_SECRET_ACCESS_KEY: zod_1.z.string().min(1),
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:3000'),
    ADMIN_DASHBOARD_URL: zod_1.z.string().default('http://localhost:3000'),
    API_BASE_URL: zod_1.z.string().default('http://localhost:4000/api/v1'),
});
const parseEnv = (input) => envSchema.parse(input);
exports.parseEnv = parseEnv;
exports.appConstants = {
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
};
//# sourceMappingURL=index.js.map