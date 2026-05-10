import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserStatus } from '@prisma/client';
import { AppEnv } from '@wordcast/config';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RbacService } from '../rbac/rbac.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

interface RefreshTokenPayload {
  sub: string;
  sid: string;
  typ: 'refresh';
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  sessionId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppEnv>,
    private readonly auditService: AuditService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async register(dto: RegisterDto, context: RequestContext) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await argon2.hash(dto.password);

    const listenerRole = await this.prisma.role.findUnique({ where: { code: 'listener' } });
    if (!listenerRole) {
      throw new BadRequestException('Default role missing');
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        displayName: dto.displayName,
        roles: {
          create: {
            roleId: listenerRole.id,
          },
        },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    const roleState = await this.rbacService.getUserRolesAndPermissions(user.id);
    const tokenPair = await this.issueTokenPair(
      user.id,
      user.email,
      context,
      dto.deviceFingerprint,
    );

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const [subscription, entitlements] = await Promise.all([
      this.subscriptionsService.getCurrentSubscriptionSummary(user.id),
      this.subscriptionsService.getEntitlementSummary(user.id),
    ]);

    await this.auditService.log({
      actorUserId: user.id,
      action: 'auth.register',
      entityType: 'User',
      entityId: user.id,
      ...this.toAuditContext(context),
      metadata: { email: user.email },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        roles: roleState.roles,
        permissions: roleState.permissions,
      },
      tokens: {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        accessTokenExpiresIn: this.accessTokenTtl(),
        refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt.toISOString(),
      },
      subscription,
      entitlements,
    };
  }

  async login(dto: LoginDto, context: RequestContext) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        displayName: true,
        status: true,
        mfaEnabled: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }

    const passwordOk = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.mfaEnabled) {
      return {
        mfaRequired: true,
        message: 'MFA challenge flow scaffolded. Complete second-factor verification before token issue.',
      };
    }

    const roleState = await this.rbacService.getUserRolesAndPermissions(user.id);
    const tokenPair = await this.issueTokenPair(
      user.id,
      user.email,
      context,
      dto.deviceFingerprint,
    );

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    await this.auditService.log({
      actorUserId: user.id,
      action: 'auth.login',
      entityType: 'AuthSession',
      entityId: tokenPair.sessionId,
      ...this.toAuditContext(context),
      metadata: { roles: roleState.roles },
    });

    const [subscription, entitlements] = await Promise.all([
      this.subscriptionsService.getCurrentSubscriptionSummary(user.id),
      this.subscriptionsService.getEntitlementSummary(user.id),
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        roles: roleState.roles,
        permissions: roleState.permissions,
      },
      tokens: {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        accessTokenExpiresIn: this.accessTokenTtl(),
        refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt.toISOString(),
      },
      subscription,
      entitlements,
    };
  }

  async adminLogin(dto: LoginDto, context: RequestContext) {
    const loginResult = await this.login(dto, context);
    if ('mfaRequired' in loginResult) {
      return loginResult;
    }

    if (!this.hasAdminSurfaceAccess(loginResult.user.roles)) {
      throw new ForbiddenException('Staff or admin role required');
    }

    return loginResult;
  }

  async refresh(refreshToken: string, context: RequestContext, options?: { adminOnly?: boolean }) {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.authSession.findUnique({
      where: { id: payload.sid },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            status: true,
          },
        },
      },
    });

    if (!session || session.userId !== payload.sub || session.isRevoked || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    const validTokenHash = await argon2.verify(session.refreshTokenHash, refreshToken);
    if (!validTokenHash) {
      await this.prisma.authSession.updateMany({
        where: { userId: session.userId, isRevoked: false },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'refresh_token_reuse_detected',
        },
      });
      throw new UnauthorizedException('Session revoked');
    }

    if (session.user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }

    const roleState = await this.rbacService.getUserRolesAndPermissions(session.user.id);
    if (options?.adminOnly && !this.hasAdminSurfaceAccess(roleState.roles)) {
      await this.prisma.authSession.updateMany({
        where: { id: session.id, isRevoked: false },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'admin_scope_required',
        },
      });
      throw new ForbiddenException('Staff or admin role required');
    }

    const tokenPair = await this.issueTokenPair(
      session.user.id,
      session.user.email,
      context,
      session.deviceFingerprint ?? undefined,
    );

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'rotated',
        lastActivityAt: new Date(),
        ...(context.ipAddress !== undefined ? { ipAddress: context.ipAddress } : {}),
        ...(context.userAgent !== undefined ? { userAgent: context.userAgent } : {}),
      } satisfies Prisma.AuthSessionUpdateInput,
    });

    const [subscription, entitlements] = await Promise.all([
      this.subscriptionsService.getCurrentSubscriptionSummary(session.user.id),
      this.subscriptionsService.getEntitlementSummary(session.user.id),
    ]);

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        displayName: session.user.displayName,
        roles: roleState.roles,
        permissions: roleState.permissions,
      },
      tokens: {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        accessTokenExpiresIn: this.accessTokenTtl(),
        refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt.toISOString(),
      },
      subscription,
      entitlements,
    };
  }

  async adminRefresh(refreshToken: string, context: RequestContext) {
    return this.refresh(refreshToken, context, { adminOnly: true });
  }

  async getProfile(userId: string, options?: { adminOnly?: boolean }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roleState = await this.rbacService.getUserRolesAndPermissions(userId);
    if (options?.adminOnly && !this.hasAdminSurfaceAccess(roleState.roles)) {
      throw new ForbiddenException('Staff or admin role required');
    }

    const [subscription, entitlements] = await Promise.all([
      this.subscriptionsService.getCurrentSubscriptionSummary(userId),
      this.subscriptionsService.getEntitlementSummary(userId),
    ]);

    return {
      user: {
        ...user,
        roles: roleState.roles,
        permissions: roleState.permissions,
      },
      subscription,
      entitlements,
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (!refreshToken) {
      await this.prisma.authSession.updateMany({
        where: { userId, isRevoked: false },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'logout_all',
        },
      });
      return { ok: true };
    }

    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        ignoreExpiration: true,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.sub !== userId) {
      throw new ForbiddenException('Cannot logout another user session');
    }

    await this.prisma.authSession.updateMany({
      where: {
        id: payload.sid,
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'logout',
      },
    });

    return { ok: true };
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return { message: 'If the account exists, reset instructions have been sent.' };
    }

    const rawToken = randomUUID();
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    });

    return {
      message: 'Password reset token generated. Hook this to your email provider in production.',
    };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ ok: boolean }> {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await argon2.hash(newPassword),
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
      }),
      this.prisma.authSession.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'password_reset',
        },
      }),
    ]);

    return { ok: true };
  }

  async requestEmailVerification(email: string): Promise<{ verificationToken?: string; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return { message: 'If the account exists, verification instructions have been sent.' };
    }

    if (user.emailVerifiedAt) {
      return { message: 'Email already verified.' };
    }

    const token = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        typ: 'email-verification',
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: '1d' as any,
      },
    );

    return {
      verificationToken: token,
      message: 'Email verification token generated. Integrate with transactional email provider.',
    };
  }

  async verifyEmail(token: string): Promise<{ ok: boolean }> {
    let payload: { sub: string; typ: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string; typ: string }>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new BadRequestException('Invalid verification token');
    }

    if (payload.typ !== 'email-verification') {
      throw new BadRequestException('Invalid verification token');
    }

    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { emailVerifiedAt: new Date() },
    });

    return { ok: true };
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    context: RequestContext,
    deviceFingerprint?: string,
  ): Promise<TokenPair> {
    const accessToken = await this.signAccessToken(userId, email);

    const refreshTtlDays = this.configService.getOrThrow<number>('REFRESH_TOKEN_TTL_DAYS');
    const refreshTokenExpiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);
    const sessionId = randomUUID();
    const refreshToken = await this.signRefreshToken(userId, sessionId, refreshTtlDays);

    await this.prisma.authSession.create({
      data: {
        id: sessionId,
        userId,
        refreshTokenHash: await argon2.hash(refreshToken),
        expiresAt: refreshTokenExpiresAt,
        ...(context.ipAddress !== undefined ? { ipAddress: context.ipAddress } : {}),
        ...(context.userAgent !== undefined ? { userAgent: context.userAgent } : {}),
        ...(deviceFingerprint !== undefined ? { deviceFingerprint } : {}),
      } satisfies Prisma.AuthSessionUncheckedCreateInput,
    });

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiresAt,
      sessionId,
    };
  }

  private async signAccessToken(userId: string, email: string): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: userId,
        email,
        typ: 'access',
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.accessTokenTtl() as any,
      },
    );
  }

  private async signRefreshToken(userId: string, sessionId: string, refreshTtlDays: number): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: userId,
        sid: sessionId,
        typ: 'refresh',
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: `${refreshTtlDays}d` as any,
      },
    );
  }

  private accessTokenTtl(): string {
    return this.configService.getOrThrow<string>('ACCESS_TOKEN_TTL');
  }

  private hasAdminSurfaceAccess(roles: string[]): boolean {
    return roles.includes('admin') || roles.includes('staff');
  }

  private toAuditContext(context: RequestContext): { ipAddress?: string; userAgent?: string } {
    return {
      ...(context.ipAddress !== undefined ? { ipAddress: context.ipAddress } : {}),
      ...(context.userAgent !== undefined ? { userAgent: context.userAgent } : {}),
    };
  }
}
