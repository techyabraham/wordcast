import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import {
  type GoogleDriveUploadDto, ManualUploadDto, ManualUploadPresignDto, SocialImportDto, YoutubeUploadDto,
} from './dto/upload-job.dto';
import { UploadJobsService } from './upload-jobs.service';
import { UploadJobSource, UploadJobStatus } from '@prisma/client';

@ApiTags('admin/upload-jobs')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UploadJobsAdminController {
  constructor(private readonly uploadJobsService: UploadJobsService) {}

  @Post('uploads/manual')
  @RequirePermissions('upload.manage')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 1024 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Manual audio upload' })
  uploadManual(
    @Body() dto: ManualUploadDto,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.uploadJobsService.createManualUpload(dto, file, user);
  }

  @Post('uploads/manual/presign')
  @RequirePermissions('upload.manage')
  @ApiOperation({ summary: 'Create signed S3 upload URL for manual audio upload' })
  uploadManualPresign(@Body() dto: ManualUploadPresignDto, @CurrentUser() user: AuthenticatedUser) {
    return this.uploadJobsService.createManualUploadPresign(dto, user);
  }

  @Post('uploads/manual/:uploadJobId/complete')
  @RequirePermissions('upload.manage')
  @ApiOperation({ summary: 'Mark manual upload as ready and enqueue media processing' })
  completeManualUpload(@Param('uploadJobId') uploadJobId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.uploadJobsService.completeManualUpload(uploadJobId, user);
  }

  @Post('uploads/youtube')
  @RequirePermissions('upload.manage')
  @ApiOperation({ summary: 'Create YouTube import upload job' })
  uploadYoutube(@Body() dto: YoutubeUploadDto, @CurrentUser() user: AuthenticatedUser) {
    return this.uploadJobsService.createYoutubeImport(dto, user);
  }

  @Post('uploads/google-drive')
  @RequirePermissions('upload.manage')
  @ApiOperation({ summary: 'Create Google Drive bulk import upload job' })
  uploadGoogleDrive(@Body() dto: GoogleDriveUploadDto, @CurrentUser() user: AuthenticatedUser) {
    return this.uploadJobsService.createGoogleDriveImport(dto, user);
  }

  @Post('import-sermon')
  @RequirePermissions('upload.manage')
  @ApiOperation({ summary: 'Import sermon from social media link' })
  importSermon(@Body() dto: SocialImportDto, @CurrentUser() user: AuthenticatedUser) {
    return this.uploadJobsService.createSocialImport(dto, user);
  }

  @Get('upload-jobs')
  @RequirePermissions('upload.manage')
  @ApiOperation({ summary: 'List upload jobs' })
  list(
    @Query() query: PaginationQueryDto,
    @Query('status') status?: UploadJobStatus,
    @Query('source') source?: UploadJobSource,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.uploadJobsService.list(query, status, source, dateFrom, dateTo);
  }

  @Get('upload-jobs/:id')
  @RequirePermissions('upload.manage')
  @ApiOperation({ summary: 'Get upload job detail' })
  getById(@Param('id') id: string) {
    return this.uploadJobsService.getById(id);
  }

  @Post('upload-jobs/:id/retry')
  @RequirePermissions('upload.manage')
  @ApiOperation({ summary: 'Retry failed upload job' })
  retry(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.uploadJobsService.retry(id, user);
  }
}
