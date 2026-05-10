import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { ApproveAiReviewDto, RejectAiReviewDto } from './dto/ai-review.dto';
import { AiReviewService } from './ai-review.service';

@ApiTags('admin/ai-review')
@ApiBearerAuth()
@Controller('admin/ai-review')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('ai.review')
export class AiReviewController {
  constructor(private readonly aiReviewService: AiReviewService) {}

  @Get()
  @ApiOperation({ summary: 'List pending AI review items' })
  listPending(@Query() query: PaginationQueryDto, @Query('status') status?: string) {
    return this.aiReviewService.listPending(query, status);
  }

  @Get(':sermonId')
  @ApiOperation({ summary: 'Get AI review detail for sermon' })
  detail(@Param('sermonId') sermonId: string) {
    return this.aiReviewService.getDetail(sermonId);
  }

  @Post(':sermonId/approve')
  @ApiOperation({ summary: 'Approve AI metadata suggestions for sermon' })
  approve(
    @Param('sermonId') sermonId: string,
    @Body() dto: ApproveAiReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiReviewService.approve(sermonId, dto, user);
  }

  @Post(':sermonId/reject')
  @ApiOperation({ summary: 'Reject AI metadata suggestions for sermon' })
  reject(
    @Param('sermonId') sermonId: string,
    @Body() dto: RejectAiReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiReviewService.reject(sermonId, dto, user);
  }
}
