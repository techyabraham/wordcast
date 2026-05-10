import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { TypesenseInitService } from './typesense-init.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [SubscriptionsModule],
  controllers: [SearchController],
  providers: [TypesenseInitService, SearchService],
  exports: [SearchService],
})
export class SearchModule {}
