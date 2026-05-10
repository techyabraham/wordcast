import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AiReviewController } from './ai-review.controller';
import { AiReviewService } from './ai-review.service';

@Module({
  imports: [AuditModule],
  providers: [AiReviewService],
  controllers: [AiReviewController],
})
export class AiReviewModule {}
