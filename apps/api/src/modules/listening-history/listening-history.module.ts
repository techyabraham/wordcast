import { Module } from '@nestjs/common';
import { LibraryModule } from '../library/library.module';
import { ListeningHistoryController } from './listening-history.controller';

@Module({
  imports: [LibraryModule],
  controllers: [ListeningHistoryController],
})
export class ListeningHistoryModule {}
