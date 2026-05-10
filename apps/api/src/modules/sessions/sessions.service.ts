import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toSlug } from '../../common/utils/slug.util';
import { CreateSessionDto, UpdateSessionDto } from './dto/session.dto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listByProgram(programId?: string) {
    const where: Prisma.SessionWhereInput = {
      deletedAt: null,
      ...(programId ? { programId } : {}),
    };

    const sessions = await this.prisma.session.findMany({
      where,
      orderBy: [{ dayNumber: 'asc' }, { sessionOrder: 'asc' }],
      include: {
        program: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            sermons: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    return sessions.map((session) => ({
      ...session,
      sermonCount: session._count.sermons,
    }));
  }

  async getById(id: string) {
    const session = await this.prisma.session.findFirst({
      where: { id, deletedAt: null },
      include: {
        program: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        sermons: {
          where: { deletedAt: null },
          include: {
            preacher: { select: { id: true, displayName: true } },
          },
          orderBy: [{ datePreached: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async create(dto: CreateSessionDto, actor: AuthenticatedUser) {
    const program = await this.prisma.program.findFirst({ where: { id: dto.programId, deletedAt: null } });
    if (!program) {
      throw new NotFoundException('Program not found');
    }

    const slug = await this.uniqueSlug(toSlug(`${program.name}-${dto.name}-${dto.sessionOrder}`));

    const session = await this.prisma.session.create({
      data: {
        programId: dto.programId,
        slug,
        name: dto.name,
        sessionLabel: dto.sessionLabel,
        sessionOrder: dto.sessionOrder,
        ...(dto.dayNumber !== undefined ? { dayNumber: dto.dayNumber } : {}),
        ...(dto.customLabel !== undefined ? { customLabel: dto.customLabel } : {}),
        ...(dto.sessionDate !== undefined ? { sessionDate: new Date(dto.sessionDate) } : {}),
        ...(dto.startTime !== undefined ? { startTime: new Date(dto.startTime) } : {}),
        ...(dto.endTime !== undefined ? { endTime: new Date(dto.endTime) } : {}),
      } satisfies Prisma.SessionUncheckedCreateInput,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'session.create',
      entityType: 'Session',
      entityId: session.id,
    });

    return session;
  }

  async update(id: string, dto: UpdateSessionDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.session.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new NotFoundException('Session not found');
    }

    const updated = await this.prisma.session.update({
      where: { id },
      data: {
        ...(dto.programId !== undefined ? { programId: dto.programId } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.dayNumber !== undefined ? { dayNumber: dto.dayNumber } : {}),
        ...(dto.sessionLabel !== undefined ? { sessionLabel: dto.sessionLabel } : {}),
        ...(dto.customLabel !== undefined ? { customLabel: dto.customLabel } : {}),
        ...(dto.sessionOrder !== undefined ? { sessionOrder: dto.sessionOrder } : {}),
        ...(dto.sessionDate !== undefined ? { sessionDate: new Date(dto.sessionDate) } : {}),
        ...(dto.startTime !== undefined ? { startTime: new Date(dto.startTime) } : {}),
        ...(dto.endTime !== undefined ? { endTime: new Date(dto.endTime) } : {}),
      } satisfies Prisma.SessionUncheckedUpdateInput,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'session.edit',
      entityType: 'Session',
      entityId: id,
    });

    return updated;
  }

  async reorder(programId: string, orderedIds: string[], actor: AuthenticatedUser) {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.session.updateMany({
          where: { id, programId },
          data: { sessionOrder: index + 1 },
        }),
      ),
    );

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'session.reorder',
      entityType: 'Program',
      entityId: programId,
      metadata: { orderedIds },
    });

    return { ok: true };
  }

  private async uniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug || 'session';
    let counter = 1;

    while (true) {
      const exists = await this.prisma.session.findUnique({ where: { slug } });
      if (!exists) {
        return slug;
      }
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }
  }
}
