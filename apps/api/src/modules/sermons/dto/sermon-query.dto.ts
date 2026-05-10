import { ApiPropertyOptional } from '@nestjs/swagger';
import { SermonSourceType, SermonStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class SermonQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preacherId?: string;

  @ApiPropertyOptional({ enum: SermonStatus })
  @IsOptional()
  @IsEnum(SermonStatus)
  status?: SermonStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  programId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ enum: SermonSourceType })
  @IsOptional()
  @IsEnum(SermonSourceType)
  sourceType?: SermonSourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Sort order e.g. PUBLISHED_AT_DESC' })
  @IsOptional()
  @IsString()
  sort?: string;
}
