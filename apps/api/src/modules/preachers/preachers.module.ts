import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AdminPreachersController, PreachersController } from './preachers.controller';
import { PreachersService } from './preachers.service';

@Module({
  imports: [AuditModule],
  controllers: [PreachersController, AdminPreachersController],
  providers: [PreachersService],
})
export class PreachersModule {}
