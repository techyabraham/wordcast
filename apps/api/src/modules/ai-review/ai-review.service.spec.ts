import { Test } from '@nestjs/testing';
import { AiReviewService } from './ai-review.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('AiReviewService', () => {
  let service: AiReviewService;

  const prisma = {
    sermonAIMetadata: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    sermonTopic: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    sermon: {
      update: jest.fn(),
    },
    topicSuggestion: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) =>
      cb({
        sermonTopic: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
        sermonAIMetadata: {
          update: jest.fn(),
        },
        sermon: {
          update: jest.fn(async () => ({ id: 'sermon-1', status: 'REVIEW_PENDING' })),
        },
      }),
    ),
  };

  const audit = { log: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        AiReviewService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(AiReviewService);
  });

  it('approves ai metadata for sermon', async () => {
    prisma.sermonAIMetadata.findFirst.mockResolvedValue({
      id: 'ai-1',
      sermonId: 'sermon-1',
      transcript: 'text',
      generatedDescription: 'description',
    });

    const result = await service.approve(
      'sermon-1',
      { topicIds: ['topic-1'] },
      {
        id: 'staff-1',
        email: 'staff@example.com',
        roles: ['staff'],
        permissions: ['ai.review'],
      },
    );

    expect(result.status).toBe('REVIEW_PENDING');
    expect(prisma.topicSuggestion.updateMany).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'ai.review.approve' }));
  });
});
