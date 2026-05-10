import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OkResponseDto } from '../../common/dto/action-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import {
  LibraryDownloadsResponseDto,
  LibraryHistoryResponseDto,
  LibraryOverviewResponseDto,
  LibrarySavedResponseDto, ListeningHistoryDto, SaveSermonDto,
} from './dto/library.dto';
import { LibraryService } from './library.service';

@ApiTags('library')
@ApiBearerAuth()
@Controller('library')
@UseGuards(JwtAuthGuard)
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Get()
  @ApiOperation({ summary: 'Get library overview for current user' })
  @ApiOkResponse({ type: LibraryOverviewResponseDto })
  getOverview(@CurrentUser() user: AuthenticatedUser) {
    return this.libraryService.getOverview(user.id);
  }

  @Post('save-sermon')
  @ApiOperation({ summary: 'Save sermon to user library' })
  @ApiOkResponse({ type: OkResponseDto })
  saveSermon(@CurrentUser() user: AuthenticatedUser, @Body() dto: SaveSermonDto) {
    return this.libraryService.saveSermon(user.id, dto);
  }

  @Delete('save-sermon/:sermonId')
  @ApiOperation({ summary: 'Remove sermon from user library' })
  @ApiOkResponse({ type: OkResponseDto })
  removeSavedSermon(@CurrentUser() user: AuthenticatedUser, @Param('sermonId') sermonId: string) {
    return this.libraryService.removeSavedSermon(user.id, sermonId);
  }

  @Get('saved-sermons')
  @ApiOperation({ summary: 'List saved sermons' })
  @ApiOkResponse({ type: LibrarySavedResponseDto })
  listSavedSermons(@CurrentUser() user: AuthenticatedUser) {
    return this.libraryService.listSavedSermons(user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'List listening history' })
  @ApiOkResponse({ type: LibraryHistoryResponseDto })
  listHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.libraryService.listHistory(user.id);
  }

  @Post('history')
  @ApiOperation({ summary: 'Track listening history event' })
  @ApiOkResponse({ type: OkResponseDto })
  addListeningHistory(@CurrentUser() user: AuthenticatedUser, @Body() dto: ListeningHistoryDto) {
    return this.libraryService.addListeningHistory(user.id, dto);
  }

  @Get('downloads')
  @ApiOperation({ summary: 'List downloadable sermons for current user entitlement set' })
  @ApiOkResponse({ type: LibraryDownloadsResponseDto })
  listDownloads(@CurrentUser() user: AuthenticatedUser) {
    return this.libraryService.listDownloads(user.id);
  }
}
