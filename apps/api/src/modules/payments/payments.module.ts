import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PaymentsController } from './payments.controller';
import { PaystackService } from './paystack.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [PaymentsController],
  providers: [PaystackService],
})
export class PaymentsModule {}
