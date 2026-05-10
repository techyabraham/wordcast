import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AdminSermonsController, SermonsController } from './sermons.controller';
import { SermonsService } from './sermons.service';

@Module({
  imports: [AuditModule, SubscriptionsModule],
  controllers: [SermonsController, AdminSermonsController],
  providers: [SermonsService],
  exports: [SermonsService],
})
export class SermonsModule {}
