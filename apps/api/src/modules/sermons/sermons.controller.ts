import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OkResponseDto } from '../../common/dto/action-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CreateSermonDto } from './dto/create-sermon.dto';
import {
  SermonDetailResponseDto,
  SermonDownloadResponseDto,
  SermonListResponseDto,
  SermonRelatedResponseDto,
  SermonTranscriptResponseDto,
} from './dto/public-sermon.dto';
import { SermonQueryDto } from './dto/sermon-query.dto';
import { UpdateSermonDto } from './dto/update-sermon.dto';
import { SermonsService } from './sermons.service';

@ApiTags('sermons')
@Controller('sermons')
export class SermonsController {
  constructor(private readonly sermonsService: SermonsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List published sermons' })
  @ApiOkResponse({ type: SermonListResponseDto })
  @UseGuards(OptionalJwtAuthGuard)
  list(@Query() query: SermonQueryDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.sermonsService.listPublic(query, user?.id);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get sermon details' })
  @ApiOkResponse({ type: SermonDetailResponseDto })
  @UseGuards(OptionalJwtAuthGuard)
  getOne(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.sermonsService.getPublicById(id, user?.id);
  }

  @Get(':id/related')
  @Public()
  @ApiOperation({ summary: 'Get related sermons' })
  @ApiOkResponse({ type: SermonRelatedResponseDto })
  getRelated(@Param('id') id: string) {
    return this.sermonsService.getRelated(id);
  }

  @Post(':id/play')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Record sermon play event' })
  @ApiOkResponse({ type: OkResponseDto })
  recordPlay(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.sermonsService.recordPlay(id, user?.id);
  }

  @Post(':id/share')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Record sermon share event' })
  @ApiOkResponse({ type: OkResponseDto })
  recordShare(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.sermonsService.recordShare(id, user?.id);
  }

  @Get(':id/transcript')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sermon transcript (premium entitlement required)' })
  @ApiOkResponse({ type: SermonTranscriptResponseDto })
  getTranscript(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.sermonsService.getTranscriptForUser(id, user.id);
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sermon download URL (premium entitlement required)' })
  @ApiOkResponse({ type: SermonDownloadResponseDto })
  getDownload(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.sermonsService.getDownloadForUser(id, user.id);
  }
}

@ApiTags('admin/sermons')
@ApiBearerAuth()
@Controller('admin/sermons')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminSermonsController {
  constructor(private readonly sermonsService: SermonsService) {}

  @Get()
  @RequirePermissions('sermon.edit')
  list(@Query() query: SermonQueryDto) {
    return this.sermonsService.listAdmin(query);
  }

  @Get(':id')
  @RequirePermissions('sermon.edit')
  getById(@Param('id') id: string) {
    return this.sermonsService.getAdminById(id);
  }

  @Post()
  @RequirePermissions('sermon.create')
  create(@Body() dto: CreateSermonDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sermonsService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('sermon.edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSermonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sermonsService.update(id, dto, user);
  }

  @Post(':id/publish')
  @RequirePermissions('sermon.publish')
  publish(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.sermonsService.publish(id, user);
  }

  @Post(':id/archive')
  @RequirePermissions('sermon.archive')
  archive(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.sermonsService.archive(id, user);
  }
}
