import { Test } from '@nestjs/testing';
import { PreachersService } from './preachers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { QueueService } from '../queues/queue.service';

describe('PreachersService', () => {
  let service: PreachersService;

  const prisma = {
    preacher: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    preacherFollow: {
      upsert: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) =>
      cb({
        preacherFollow: {
          upsert: jest.fn(),
          count: jest.fn(async () => 1),
        },
        preacher: {
          update: jest.fn(),
        },
      }),
    ),
  };

  const audit = { log: jest.fn() };
  const queue = { enqueueSearchSync: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        PreachersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: QueueService, useValue: queue },
      ],
    }).compile();

    service = module.get(PreachersService);
  });

  it('follows preacher', async () => {
    prisma.preacher.findFirst.mockResolvedValue({ id: 'preacher-1' });

    const result = await service.follow('preacher-1', 'user-1');

    expect(result.ok).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
