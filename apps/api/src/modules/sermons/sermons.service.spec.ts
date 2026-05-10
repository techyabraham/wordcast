import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SermonsService } from './sermons.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { QueueService } from '../queues/queue.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { MediaService } from '../media/media.service';

describe('SermonsService', () => {
  let service: SermonsService;

  const prisma = {
    sermon: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    sermonTopic: {
      deleteMany: jest.fn(),
    },
    sermonVersion: {
      count: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const audit = { log: jest.fn() };
  const queue = { enqueueSearchSync: jest.fn() };
  const subscriptions = { assertEntitlement: jest.fn(), getCurrentSubscriptionSummary: jest.fn(), getEntitlementSummary: jest.fn() };
  const media = { getPlaybackUrl: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        SermonsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: QueueService, useValue: queue },
        { provide: SubscriptionsService, useValue: subscriptions },
        { provide: MediaService, useValue: media },
      ],
    }).compile();

    service = module.get(SermonsService);
  });

  it('creates sermon in draft state', async () => {
    prisma.sermon.findUnique.mockResolvedValue(null);
    prisma.sermon.create.mockResolvedValue({
      id: 'sermon-1',
      title: 'Faith Builder',
      topics: [],
    });

    const result = await service.create(
      {
        title: 'Faith Builder',
        preacherId: 'preacher-1',
        sourceType: 'MANUAL_UPLOAD',
      },
      {
        id: 'staff-1',
        email: 'staff@example.com',
        roles: ['staff'],
        permissions: ['sermon.create'],
      },
    );

    expect(result.id).toBe('sermon-1');
    expect(prisma.sermon.create).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'sermon.create' }));
  });

  it('publishes sermon and enqueues search sync', async () => {
    prisma.sermon.update.mockResolvedValue({ id: 'sermon-1', status: 'PUBLISHED' });

    const result = await service.publish('sermon-1', {
      id: 'staff-1',
      email: 'staff@example.com',
      roles: ['staff'],
      permissions: ['sermon.publish'],
    });

    expect(result.status).toBe('PUBLISHED');
    expect(queue.enqueueSearchSync).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'sermon', entityId: 'sermon-1' }),
    );
  });

  it('throws when updating missing sermon', async () => {
    prisma.sermon.findFirst.mockResolvedValue(null);

    await expect(
      service.update(
        'missing',
        { title: 'updated' },
        {
          id: 'staff-1',
          email: 'staff@example.com',
          roles: ['staff'],
          permissions: ['sermon.edit'],
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
