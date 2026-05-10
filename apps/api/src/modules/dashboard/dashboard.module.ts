import { Module } from '@nestjs/common';
import { DashboardAdminController } from './dashboard-admin.controller';

@Module({
  controllers: [DashboardAdminController],
})
export class DashboardModule {}
