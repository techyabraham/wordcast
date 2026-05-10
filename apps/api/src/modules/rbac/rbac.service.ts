import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserRolesAndPermissions(userId: string): Promise<{ roles: string[]; permissions: string[] }> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const roles = userRoles.map((entry) => entry.role.code);
    const permissions = new Set<string>();

    userRoles.forEach((entry) => {
      entry.role.permissions.forEach((rolePermission) => {
        permissions.add(rolePermission.permission.code);
      });
    });

    return { roles, permissions: Array.from(permissions) };
  }

  async userHasPermission(userId: string, permissionCode: string): Promise<boolean> {
    const count = await this.prisma.userRole.count({
      where: {
        userId,
        role: {
          permissions: {
            some: {
              permission: {
                code: permissionCode,
              },
            },
          },
        },
      },
    });

    return count > 0;
  }
}
