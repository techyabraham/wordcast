import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OkResponseDto } from '../../common/dto/action-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CreatePreacherDto, UpdatePreacherDto } from './dto/preacher.dto';
import { PreacherDetailResponseDto, PreacherListResponseDto } from './dto/public-preacher.dto';
import { PreachersService } from './preachers.service';

@ApiTags('preachers')
@Controller('preachers')
export class PreachersController {
  constructor(private readonly preachersService: PreachersService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List preachers' })
  @ApiOkResponse({ type: PreacherListResponseDto })
  list(@Query() query: PaginationQueryDto) {
    return this.preachersService.list(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get preacher by id' })
  @ApiOkResponse({ type: PreacherDetailResponseDto })
  getById(@Param('id') id: string) {
    return this.preachersService.getById(id);
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow preacher' })
  @ApiOkResponse({ type: OkResponseDto })
  follow(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.preachersService.follow(id, user.id);
  }

  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow preacher' })
  @ApiOkResponse({ type: OkResponseDto })
  unfollow(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.preachersService.unfollow(id, user.id);
  }
}

@ApiTags('admin/preachers')
@ApiBearerAuth()
@Controller('admin/preachers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminPreachersController {
  constructor(private readonly preachersService: PreachersService) {}

  @Post()
  @RequirePermissions('preacher.create')
  create(@Body() dto: CreatePreacherDto, @CurrentUser() user: AuthenticatedUser) {
    return this.preachersService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('preacher.edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePreacherDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.preachersService.update(id, dto, user);
  }
}
