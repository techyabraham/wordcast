import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AdminSessionsController, SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [AuditModule],
  providers: [SessionsService],
  controllers: [SessionsController, AdminSessionsController],
})
export class SessionsModule {}
