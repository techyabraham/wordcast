import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OkResponseDto } from '../../common/dto/action-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AddPlaylistSermonDto, CreatePlaylistDto, UpdatePlaylistDto } from './dto/playlist.dto';
import {
  PlaylistDetailResponseDto,
  PlaylistListResponseDto,
} from './dto/public-playlist.dto';
import { PlaylistsService } from './playlists.service';

@ApiTags('playlists')
@ApiBearerAuth()
@Controller('playlists')
@UseGuards(JwtAuthGuard)
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Post()
  @ApiOperation({ summary: 'Create playlist' })
  @ApiOkResponse({ type: PlaylistDetailResponseDto })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePlaylistDto) {
    return this.playlistsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List current user playlists' })
  @ApiOkResponse({ type: PlaylistListResponseDto })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.playlistsService.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get playlist detail' })
  @ApiOkResponse({ type: PlaylistDetailResponseDto })
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') playlistId: string) {
    return this.playlistsService.getById(user.id, playlistId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update playlist' })
  @ApiOkResponse({ type: PlaylistDetailResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') playlistId: string,
    @Body() dto: UpdatePlaylistDto,
  ) {
    return this.playlistsService.update(user.id, playlistId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete playlist' })
  @ApiOkResponse({ type: OkResponseDto })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') playlistId: string) {
    return this.playlistsService.remove(user.id, playlistId);
  }

  @Post(':id/sermons')
  @ApiOperation({ summary: 'Add sermon to playlist' })
  @ApiOkResponse({ type: OkResponseDto })
  addSermon(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') playlistId: string,
    @Body() dto: AddPlaylistSermonDto,
  ) {
    return this.playlistsService.addSermon(user.id, playlistId, dto);
  }

  @Delete(':id/sermons/:sermonId')
  @ApiOperation({ summary: 'Remove sermon from playlist' })
  @ApiOkResponse({ type: OkResponseDto })
  removeSermon(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') playlistId: string,
    @Param('sermonId') sermonId: string,
  ) {
    return this.playlistsService.removeSermon(user.id, playlistId, sermonId);
  }
}
