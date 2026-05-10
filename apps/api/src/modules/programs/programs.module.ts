import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AdminProgramsController, ProgramsController } from './programs.controller';
import { ProgramsService } from './programs.service';

@Module({
  imports: [AuditModule],
  providers: [ProgramsService],
  controllers: [ProgramsController, AdminProgramsController],
  exports: [ProgramsService],
})
export class ProgramsModule {}
