import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CreateTopicDto, UpdateTopicDto } from './dto/topic.dto';
import { TopicDetailResponseDto, TopicListResponseDto } from './dto/public-topic.dto';
import { TopicsService } from './topics.service';

@ApiTags('topics')
@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List active topics' })
  @ApiOkResponse({ type: TopicListResponseDto })
  list(@Query() query: PaginationQueryDto) {
    return this.topicsService.list(query);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get topic by slug' })
  @ApiOkResponse({ type: TopicDetailResponseDto })
  getBySlug(@Param('slug') slug: string) {
    return this.topicsService.getBySlug(slug);
  }
}

@ApiTags('admin/topics')
@ApiBearerAuth()
@Controller('admin/topics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminTopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  @ApiOperation({ summary: 'List topics for admin, including inactive topics' })
  @ApiOkResponse({ type: TopicListResponseDto })
  list(@Query() query: PaginationQueryDto) {
    return this.topicsService.listAdmin(query);
  }

  @Get('detail/:id')
  @RequirePermissions('topic.edit')
  @ApiOperation({ summary: 'Get topic detail for admin' })
  getById(@Param('id') id: string) {
    return this.topicsService.getAdminById(id);
  }

  @Post()
  @RequirePermissions('topic.create')
  create(@Body() dto: CreateTopicDto, @CurrentUser() user: AuthenticatedUser) {
    return this.topicsService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('topic.edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTopicDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.topicsService.update(id, dto, user);
  }

  @Get('suggestions')
  @RequirePermissions('topic.edit')
  @ApiOperation({ summary: 'List topic suggestions' })
  listSuggestions(@Query() query: PaginationQueryDto, @Query('status') status?: string) {
    return this.topicsService.listSuggestions(query, status);
  }

  @Post('suggestions/:id/approve')
  @RequirePermissions('topic.edit')
  @ApiOperation({ summary: 'Approve topic suggestion as new topic' })
  approveSuggestion(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.topicsService.approveSuggestion(id, user);
  }

  @Post('suggestions/:id/merge')
  @RequirePermissions('topic.edit')
  @ApiOperation({ summary: 'Merge topic suggestion into existing topic' })
  mergeSuggestion(
    @Param('id') id: string,
    @Body() body: { topicId: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.topicsService.mergeSuggestion(id, body.topicId, user);
  }

  @Post('suggestions/:id/reject')
  @RequirePermissions('topic.edit')
  @ApiOperation({ summary: 'Reject topic suggestion' })
  rejectSuggestion(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.topicsService.rejectSuggestion(id, user);
  }
}
