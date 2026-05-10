/**
 * Auth integration tests — register → login → refresh → logout cycle.
 *
 * Requires a running database and Redis (use docker-compose to start them).
 * Run with: pnpm test:e2e
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

const TEST_EMAIL = `integration-auth-${Date.now()}@test.wordcast.dev`;
const TEST_PASSWORD = 'Test@Pass123!';
const TEST_DISPLAY_NAME = 'Integration Test User';

function setTestEnv() {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '4001';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ?? 'postgresql://wordcast:wordcast@localhost:5432/wordcast?schema=public';
  process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
  process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
  process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
  process.env.ACCESS_TOKEN_TTL = '15m';
  process.env.REFRESH_TOKEN_TTL_DAYS = '30';
  process.env.TYPESENSE_HOST = 'localhost';
  process.env.TYPESENSE_PORT = '8108';
  process.env.TYPESENSE_PROTOCOL = 'http';
  process.env.TYPESENSE_API_KEY = 'xyz-test';
  process.env.PAYSTACK_SECRET_KEY = 'sk_test';
  process.env.PAYSTACK_WEBHOOK_SECRET = 'wh_test';
  process.env.OPENAI_API_KEY = 'sk-test';
  process.env.S3_REGION = 'eu-west-1';
  process.env.S3_BUCKET = 'wordcast-test';
  process.env.S3_ACCESS_KEY_ID = 'key';
  process.env.S3_SECRET_ACCESS_KEY = 'secret';
  process.env.CORS_ORIGIN = 'http://localhost:3000';
  process.env.ADMIN_DASHBOARD_URL = 'http://localhost:3000';
  process.env.API_BASE_URL = 'http://localhost:4001/api/v1';
}

describe('Auth (integration)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    setTestEnv();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Registration ─────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('rejects missing fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({})
        .expect(400);
    });

    it('rejects a weak password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'weak@test.com', password: '123', displayName: 'Weak' })
        .expect(400);
    });

    it('registers a new listener account', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD, displayName: TEST_DISPLAY_NAME })
        .expect(201);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          },
          user: {
            email: TEST_EMAIL,
          },
        },
      });

      accessToken = res.body.data.tokens.accessToken as string;
      refreshToken = res.body.data.tokens.refreshToken as string;
    });

    it('rejects duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD, displayName: 'Dup' })
        .expect(409);
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('rejects wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: 'WrongPassword123!' })
        .expect(401);
    });

    it('logs in with correct credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
        .expect(201);

      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      // Update tokens for subsequent tests
      accessToken = res.body.data.tokens.accessToken as string;
      refreshToken = res.body.data.tokens.refreshToken as string;
    });

    it('rejects unknown email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'ghost@test.com', password: TEST_PASSWORD })
        .expect(401);
    });
  });

  // ── Authenticated profile ─────────────────────────────────────────────────

  describe('GET /api/v1/auth/me', () => {
    it('returns profile for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toMatchObject({ email: TEST_EMAIL });
    });

    it('rejects unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('rejects a tampered access token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer not.a.valid.jwt')
        .expect(401);
    });
  });

  // ── Token refresh ──────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('issues new token pair with valid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(201);

      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      // Rotate tokens for the logout test
      accessToken = res.body.data.tokens.accessToken as string;
      refreshToken = res.body.data.tokens.refreshToken as string;
    });

    it('rejects reuse of the old refresh token after rotation', async () => {
      // Issue a fresh pair
      const first = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      const oldRefreshToken = first.body.data.tokens.refreshToken as string;

      // Consume the refresh token once
      const second = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(201);

      // Store the new tokens
      accessToken = second.body.data.tokens.accessToken as string;
      refreshToken = second.body.data.tokens.refreshToken as string;

      // Reusing the original refresh token must be denied (token rotation / reuse detection)
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);
    });
  });

  // ── Logout ─────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/logout', () => {
    it('logs out and invalidates the session', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(201);

      // Refresh should now fail — session is revoked
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });
});
