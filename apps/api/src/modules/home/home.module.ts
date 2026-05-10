import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
