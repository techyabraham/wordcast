import { Test } from '@nestjs/testing';
import { UploadJobsService } from './upload-jobs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../queues/queue.service';
import { AuditService } from '../audit/audit.service';
import { MediaService } from '../media/media.service';

describe('UploadJobsService', () => {
  let service: UploadJobsService;

  const prisma = {
    sermon: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) =>
      cb({
        sermon: {
          create: jest.fn(async () => ({ id: 'sermon-1' })),
        },
        uploadJob: {
          create: jest.fn(async () => ({ id: 'job-1' })),
        },
        mediaAsset: {
          create: jest.fn(async () => ({ id: 'asset-1', objectKey: 'sermons/sermon-1/audio/raw/file.mp3' })),
        },
      }),
    ),
    uploadJob: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    mediaAsset: {
      update: jest.fn(),
    },
  };

  const queue = {
    enqueueMediaProcessing: jest.fn(),
  };

  const audit = { log: jest.fn() };
  const media = {
    uploadObject: jest.fn(async ({ key }: { key: string }) => ({ key, url: `https://example.com/${key}` })),
    createSignedUploadUrl: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        UploadJobsService,
        { provide: PrismaService, useValue: prisma },
        { provide: QueueService, useValue: queue },
        { provide: AuditService, useValue: audit },
        { provide: MediaService, useValue: media },
      ],
    }).compile();

    service = module.get(UploadJobsService);
  });

  it('creates manual upload job and enqueues media processing', async () => {
    const file = {
      originalname: 'sample.mp3',
      mimetype: 'audio/mpeg',
      size: 1024,
      buffer: Buffer.from('audio'),
    } as any;

    const result = await service.createManualUpload(
      {
        title: 'Sample Sermon',
        preacherId: 'preacher-1',
      },
      file,
      {
        id: 'staff-1',
        email: 'staff@example.com',
        roles: ['staff'],
        permissions: ['upload.manage'],
      },
    );

    expect(result.uploadJob.id).toBe('job-1');
    expect(queue.enqueueMediaProcessing).toHaveBeenCalled();
  });
});
