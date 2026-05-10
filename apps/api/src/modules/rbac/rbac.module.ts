import { Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RbacAdminController } from './rbac.controller';

@Module({
  controllers: [RbacAdminController],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
