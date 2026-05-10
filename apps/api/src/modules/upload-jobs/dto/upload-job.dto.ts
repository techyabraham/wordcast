import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsPositive, IsString, IsUrl, MaxLength } from 'class-validator';

export class ManualUploadDto {
  @ApiProperty()
  @IsString()
  @MaxLength(180)
  title!: string;

  @ApiProperty()
  @IsString()
  preacherId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  programId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  churchName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  datePreached?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  speakerRole?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ManualUploadPresignDto extends ManualUploadDto {
  @ApiProperty()
  @IsString()
  fileName!: string;

  @ApiProperty()
  @IsString()
  contentType!: string;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  sizeBytes!: number;
}

export class YoutubeUploadDto {
  @ApiProperty()
  @IsUrl({ require_protocol: true })
  youtubeUrl!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  preacherId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  programId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  churchName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  datePreached?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class GoogleDriveUploadDto {
  @ApiProperty()
  @IsUrl({ require_protocol: true })
  folderUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  importLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultPreacherId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultProgramId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultSessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultChurchName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  defaultDatePreached?: string;
}

export class SocialImportDto {
  @ApiProperty()
  @IsUrl({ require_protocol: true })
  sourceUrl!: string;

  @ApiProperty({ description: 'Preacher id for the sermon record' })
  @IsString()
  preacher!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
