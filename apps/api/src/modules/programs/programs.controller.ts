import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CreateProgramDto, UpdateProgramDto } from './dto/program.dto';
import { ProgramDetailResponseDto, ProgramListResponseDto } from './dto/public-program.dto';
import { ProgramsService } from './programs.service';

@ApiTags('programs')
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List programs' })
  @ApiOkResponse({ type: ProgramListResponseDto })
  list(@Query() query: PaginationQueryDto) {
    return this.programsService.list(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get program details' })
  @ApiOkResponse({ type: ProgramDetailResponseDto })
  getById(@Param('id') id: string) {
    return this.programsService.getById(id);
  }
}

@ApiTags('admin/programs')
@ApiBearerAuth()
@Controller('admin/programs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Post()
  @RequirePermissions('program.create')
  create(@Body() dto: CreateProgramDto, @CurrentUser() user: AuthenticatedUser) {
    return this.programsService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('program.edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProgramDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.programsService.update(id, dto, user);
  }
}
