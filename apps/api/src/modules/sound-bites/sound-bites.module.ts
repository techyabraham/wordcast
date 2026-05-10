import { Module } from '@nestjs/common';
import { SoundBitesController } from './sound-bites.controller';
import { SoundBitesService } from './sound-bites.service';

@Module({
  providers: [SoundBitesService],
  controllers: [SoundBitesController],
})
export class SoundBitesModule {}
