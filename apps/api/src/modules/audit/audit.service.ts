import { Injectable } from '@nestjs/common';
import { AuditSeverity, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface AuditLogInput {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  severity?: AuditSeverity;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      action: input.action,
      entityType: input.entityType,
      severity: input.severity ?? AuditSeverity.INFO,
      ...(input.actorUserId !== undefined ? { actorUserId: input.actorUserId } : {}),
      ...(input.entityId !== undefined ? { entityId: input.entityId } : {}),
      ...(input.ipAddress !== undefined ? { ipAddress: input.ipAddress } : {}),
      ...(input.userAgent !== undefined ? { userAgent: input.userAgent } : {}),
      ...(input.metadata !== undefined ? { metadata: input.metadata as never } : {}),
    };

    await this.prisma.auditLog.create({
      data,
    });
  }
}
