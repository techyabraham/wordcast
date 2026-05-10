import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AdminTopicsController, TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';

@Module({
  imports: [AuditModule],
  providers: [TopicsService],
  controllers: [TopicsController, AdminTopicsController],
  exports: [TopicsService],
})
export class TopicsModule {}
