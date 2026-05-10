import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Public API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '4000';
    process.env.DATABASE_URL = 'postgresql://wordcast:wordcast@localhost:5432/wordcast?schema=public';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
    process.env.ACCESS_TOKEN_TTL = '15m';
    process.env.REFRESH_TOKEN_TTL_DAYS = '30';
    process.env.TYPESENSE_HOST = 'localhost';
    process.env.TYPESENSE_PORT = '8108';
    process.env.TYPESENSE_PROTOCOL = 'http';
    process.env.TYPESENSE_API_KEY = 'xyz-wordcast-typesense-key';
    process.env.PAYSTACK_SECRET_KEY = 'sk_test';
    process.env.PAYSTACK_WEBHOOK_SECRET = 'secret';
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.S3_REGION = 'eu-west-1';
    process.env.S3_BUCKET = 'wordcast-dev';
    process.env.S3_ACCESS_KEY_ID = 'key';
    process.env.S3_SECRET_ACCESS_KEY = 'secret';
    process.env.CORS_ORIGIN = 'http://localhost:3000';
    process.env.ADMIN_DASHBOARD_URL = 'http://localhost:3000';
    process.env.API_BASE_URL = 'http://localhost:4000/api/v1';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/health (GET)', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });

  it('/api/v1/sermons (GET)', async () => {
    await request(app.getHttpServer()).get('/api/v1/sermons').expect(200);
  });
});
