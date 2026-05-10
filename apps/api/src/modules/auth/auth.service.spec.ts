import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from '../rbac/rbac.service';
import { AuditService } from '../audit/audit.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

jest.mock('argon2', () => ({
  hash: jest.fn(async (value: string) => `hashed:${value}`),
  verify: jest.fn(async (hash: string, value: string) => hash === `hashed:${value}`),
}));

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    authSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const rbac = {
    getUserRolesAndPermissions: jest.fn(async () => ({ roles: ['listener'], permissions: [] })),
  };

  const jwt = {
    signAsync: jest.fn(async () => 'jwt-token'),
    verifyAsync: jest.fn(),
  };

  const config = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string | number> = {
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
        ACCESS_TOKEN_TTL: '15m',
        REFRESH_TOKEN_TTL_DAYS: 30,
      };
      return values[key];
    }),
  };

  const audit = { log: jest.fn() };
  const subscriptions = {
    getCurrentSubscriptionSummary: jest.fn(async () => null),
    getEntitlementSummary: jest.fn(async () => ({
      transcriptAccess: false,
      downloadAccess: false,
      adFree: false,
      enhancedLinking: false,
    })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: RbacService, useValue: rbac },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
        { provide: AuditService, useValue: audit },
        { provide: SubscriptionsService, useValue: subscriptions },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('registers a new listener user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findUnique.mockResolvedValue({ id: 'listener-role' });
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'listener@example.com',
      displayName: 'Listener',
    });

    const result = await service.register(
      {
        email: 'listener@example.com',
        password: 'Passw0rd123!',
        displayName: 'Listener',
      },
      {},
    );

    expect(result.user.email).toBe('listener@example.com');
    expect(prisma.user.create).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalled();
  });

  it('rejects login for invalid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login(
        {
          email: 'ghost@example.com',
          password: 'wrong-password',
        },
        {},
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('issues tokens on valid login', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'listener@example.com',
      passwordHash: 'hashed:Passw0rd123!',
      displayName: 'Listener',
      status: 'ACTIVE',
      mfaEnabled: false,
    });
    prisma.authSession.create.mockResolvedValue({ id: 'session-1' });

    const result = await service.login(
      {
        email: 'listener@example.com',
        password: 'Passw0rd123!',
      },
      {},
    );

    expect(result).toHaveProperty('tokens.accessToken');
    expect(prisma.authSession.create).toHaveBeenCalled();
  });

  it('refreshes session token pair', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', sid: 'session-1', typ: 'refresh' });
    prisma.authSession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: 'hashed:refresh-token',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: 'user-1',
        email: 'listener@example.com',
        status: 'ACTIVE',
      },
    });

    const result = await service.refresh('refresh-token', {});

    expect(result).toHaveProperty('tokens.accessToken');
    expect(prisma.authSession.update).toHaveBeenCalled();
  });

  it('logs out all sessions for user', async () => {
    const result = await service.logout('user-1');

    expect(result.ok).toBe(true);
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }),
    );
  });
});
