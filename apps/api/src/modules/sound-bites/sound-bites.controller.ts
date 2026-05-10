import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OkResponseDto } from '../../common/dto/action-response.dto';
import { Public } from '../../common/decorators/public.decorator';
import { SoundBitesQueryDto } from './dto/sound-bites-query.dto';
import { SoundBiteDetailResponseDto, SoundBiteListResponseDto } from './dto/public-sound-bite.dto';
import { SoundBitesService } from './sound-bites.service';

@ApiTags('sound-bites')
@Controller('sound-bites')
export class SoundBitesController {
  constructor(private readonly soundBitesService: SoundBitesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List published sound bites' })
  @ApiOkResponse({ type: SoundBiteListResponseDto })
  list(@Query() query: SoundBitesQueryDto) {
    return this.soundBitesService.list(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get sound bite detail' })
  @ApiOkResponse({ type: SoundBiteDetailResponseDto })
  getById(@Param('id') id: string) {
    return this.soundBitesService.getById(id);
  }

  @Post(':id/play')
  @Public()
  @ApiOperation({ summary: 'Record sound bite play' })
  @ApiOkResponse({ type: OkResponseDto })
  recordPlay(@Param('id') id: string) {
    return this.soundBitesService.recordPlay(id);
  }

  @Post(':id/share')
  @Public()
  @ApiOperation({ summary: 'Record sound bite share' })
  @ApiOkResponse({ type: OkResponseDto })
  recordShare(@Param('id') id: string) {
    return this.soundBitesService.recordShare(id);
  }
}
