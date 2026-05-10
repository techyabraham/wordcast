import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CreateSessionDto, UpdateSessionDto } from './dto/session.dto';
import { SessionsService } from './sessions.service';

class SessionReorderDto {
  @IsArray()
  @IsString({ each: true })
  orderedIds!: string[];
}

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List sessions, optionally filtered by programId' })
  list(@Query('programId') programId?: string) {
    return this.sessionsService.listByProgram(programId);
  }
}

@ApiTags('admin/sessions')
@ApiBearerAuth()
@Controller('admin/sessions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminSessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get(':id')
  @RequirePermissions('session.edit')
  getById(@Param('id') id: string) {
    return this.sessionsService.getById(id);
  }

  @Post()
  @RequirePermissions('session.create')
  create(@Body() dto: CreateSessionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sessionsService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('session.edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sessionsService.update(id, dto, user);
  }

  @Post('programs/:programId/reorder')
  @RequirePermissions('session.edit')
  reorder(
    @Param('programId') programId: string,
    @Body() dto: SessionReorderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sessionsService.reorder(programId, dto.orderedIds, user);
  }
}
