import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toSlug } from '../../common/utils/slug.util';
import { CreateProgramDto, UpdateProgramDto } from './dto/program.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { QueueService } from '../queues/queue.service';

@Injectable()
export class ProgramsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
  ) {}

  async list(query: PaginationQueryDto) {
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.program.findMany({
        where: { deletedAt: null },
        skip,
        take: query.pageSize,
        orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.program.count({ where: { deletedAt: null } }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        year: item.year,
        theme: item.theme,
        organizer: item.organizer,
        programType: item.programType,
        location: item.location,
        startDate: item.startDate,
        endDate: item.endDate,
        description: item.description,
        coverImage: item.coverImage,
      })),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async getById(id: string) {
    const program = await this.prisma.program.findFirst({
      where: { id, deletedAt: null },
      include: {
        sessions: {
          where: { deletedAt: null },
          orderBy: { sessionOrder: 'asc' },
        },
      },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }
    const sermons = await this.prisma.sermon.findMany({
      where: { programId: id, status: 'PUBLISHED', deletedAt: null },
      include: {
        preacher: { select: { displayName: true } },
        session: { select: { id: true, name: true, sessionOrder: true } },
      },
      orderBy: [{ sessionId: 'asc' }, { publishedAt: 'desc' }],
    });

    const sermonGroups = sermons.reduce(
      (acc, sermon) => {
        const key = sermon.sessionId ?? 'unassigned';
        if (!acc[key]) {
          acc[key] = {
            sessionId: sermon.sessionId,
            sessionName: sermon.session?.name ?? null,
            sermons: [],
          };
        }
        acc[key].sermons.push({
          id: sermon.id,
          title: sermon.title,
          preacherName: sermon.preacher?.displayName ?? null,
        });
        return acc;
      },
      {} as Record<string, { sessionId: string | null; sessionName: string | null; sermons: Array<{ id: string; title: string; preacherName: string | null }> }>,
    );

    const featuredPreachers = await this.prisma.sermon.groupBy({
      by: ['preacherId'],
      where: { programId: id, status: 'PUBLISHED', deletedAt: null },
      _count: { preacherId: true },
      orderBy: { _count: { preacherId: 'desc' } },
      take: 6,
    });

    const preacherIds = featuredPreachers.map((entry) => entry.preacherId);
    const preachers = preacherIds.length
      ? await this.prisma.preacher.findMany({
          where: { id: { in: preacherIds }, deletedAt: null },
          select: { id: true, displayName: true, profileImageUrl: true },
        })
      : [];

    return {
      id: program.id,
      name: program.name,
      slug: program.slug,
      year: program.year,
      theme: program.theme,
      organizer: program.organizer,
      programType: program.programType,
      location: program.location,
      startDate: program.startDate,
      endDate: program.endDate,
      description: program.description,
      coverImage: program.coverImage,
      sessions: program.sessions.map((session) => ({
        id: session.id,
        name: session.name,
        dayNumber: session.dayNumber,
        sessionLabel: session.sessionLabel,
        sessionOrder: session.sessionOrder,
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        endTime: session.endTime,
      })),
      sermonGroups: Object.values(sermonGroups),
      featuredPreachers: preachers,
      playAll: {
        sermonCount: sermons.length,
      },
    };
  }

  async create(dto: CreateProgramDto, actor: AuthenticatedUser) {
    const slug = await this.uniqueSlug(toSlug(`${dto.name}-${dto.year ?? ''}`));

    const program = await this.prisma.program.create({
      data: {
        slug,
        name: dto.name,
        programType: dto.programType,
        ...(dto.year !== undefined ? { year: dto.year } : {}),
        ...(dto.theme !== undefined ? { theme: dto.theme } : {}),
        ...(dto.organizer !== undefined ? { organizer: dto.organizer } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.coverImage !== undefined ? { coverImage: dto.coverImage } : {}),
        ...(dto.ministryId !== undefined ? { ministryId: dto.ministryId } : {}),
      } satisfies Prisma.ProgramUncheckedCreateInput,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'program.create',
      entityType: 'Program',
      entityId: program.id,
    });

    await this.queueService.enqueueSearchSync({
      entityType: 'program',
      entityId: program.id,
      action: 'upsert',
    });

    return program;
  }

  async update(id: string, dto: UpdateProgramDto, actor: AuthenticatedUser) {
    const program = await this.prisma.program.findFirst({ where: { id, deletedAt: null } });
    if (!program) {
      throw new NotFoundException('Program not found');
    }

    const updated = await this.prisma.program.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.year !== undefined ? { year: dto.year } : {}),
        ...(dto.theme !== undefined ? { theme: dto.theme } : {}),
        ...(dto.organizer !== undefined ? { organizer: dto.organizer } : {}),
        ...(dto.programType !== undefined ? { programType: dto.programType } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.coverImage !== undefined ? { coverImage: dto.coverImage } : {}),
        ...(dto.ministryId !== undefined ? { ministryId: dto.ministryId } : {}),
      } satisfies Prisma.ProgramUncheckedUpdateInput,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'program.edit',
      entityType: 'Program',
      entityId: id,
    });

    await this.queueService.enqueueSearchSync({
      entityType: 'program',
      entityId: id,
      action: 'upsert',
    });

    return updated;
  }

  private async uniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug || 'program';
    let counter = 1;

    while (true) {
      const exists = await this.prisma.program.findUnique({ where: { slug } });
      if (!exists) {
        return slug;
      }
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }
  }
}
