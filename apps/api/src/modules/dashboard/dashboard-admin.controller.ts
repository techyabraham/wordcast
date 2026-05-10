import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('admin/dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('sermon.edit')
export class DashboardAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Admin dashboard summary metrics' })
  async summary() {
    const [
      totalSermons,
      draftSermons,
      processingSermons,
      publishedSermons,
      pendingAiReviews,
      failedUploadJobs,
      totalPrograms,
      totalPreachers,
    ] = await Promise.all([
      this.prisma.sermon.count({ where: { deletedAt: null } }),
      this.prisma.sermon.count({ where: { status: 'DRAFT', deletedAt: null } }),
      this.prisma.sermon.count({
        where: {
          status: {
            in: ['PROCESSING', 'REVIEW_PENDING'],
          },
          deletedAt: null,
        },
      }),
      this.prisma.sermon.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
      this.prisma.sermonAIMetadata.count({
        where: {
          status: {
            in: ['GENERATED', 'REVIEWED'],
          },
        },
      }),
      this.prisma.uploadJob.count({ where: { status: 'FAILED' } }),
      this.prisma.program.count({ where: { deletedAt: null } }),
      this.prisma.preacher.count({ where: { deletedAt: null } }),
    ]);

    return {
      totalSermons,
      draftSermons,
      processingSermons,
      publishedSermons,
      pendingAiReviews,
      failedUploadJobs,
      totalPrograms,
      totalPreachers,
    };
  }
}
