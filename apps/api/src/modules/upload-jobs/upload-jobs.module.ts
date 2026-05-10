import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { UploadJobsAdminController } from './upload-jobs.controller';
import { UploadJobsService } from './upload-jobs.service';

@Module({
  imports: [AuditModule],
  providers: [UploadJobsService],
  controllers: [UploadJobsAdminController],
  exports: [UploadJobsService],
})
export class UploadJobsModule {}
