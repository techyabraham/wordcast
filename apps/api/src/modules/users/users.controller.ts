import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        phoneNumber: true,
        status: true,
        emailVerifiedAt: true,
        mfaEnabled: true,
        createdAt: true,
      },
    });
  }
}

@ApiTags('admin/users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@RequirePermissions('user.manage')
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List users for admin' })
  async list(@Query() query: PaginationQueryDto) {
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          roles: {
            select: {
              role: {
                select: {
                  code: true,
                },
              },
            },
          },
          subscriptions: {
            where: { status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              plan: {
                select: { code: true, name: true },
              },
            },
          },
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      items: items.map((entry) => ({
        ...entry,
        roles: entry.roles.map((r) => r.role.code),
        subscriptionPlan: entry.subscriptions[0]?.plan ?? null,
      })),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user detail for admin' })
  async getById(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        roles: {
          select: {
            role: {
              select: { code: true },
            },
          },
        },
        entitlements: {
          select: { type: true, isActive: true },
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            startsAt: true,
            endsAt: true,
            plan: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        authSessions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            createdAt: true,
            lastActivityAt: true,
            ipAddress: true,
            userAgent: true,
            isRevoked: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      roles: user.roles.map((entry) => entry.role.code),
      recentSessions: user.authSessions,
    };
  }
}
