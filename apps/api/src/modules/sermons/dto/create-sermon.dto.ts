import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SermonSourceType, SermonSpeakerRole } from '@prisma/client';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSermonDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
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
  @MaxLength(180)
  churchName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  datePreached?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12 * 60 * 60)
  durationSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional({ default: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(12)
  language?: string;

  @ApiProperty({ enum: SermonSourceType })
  @IsEnum(SermonSourceType)
  sourceType!: SermonSourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @ApiPropertyOptional({ enum: SermonSpeakerRole })
  @IsOptional()
  @IsEnum(SermonSpeakerRole)
  speakerRole?: SermonSpeakerRole;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topicIds?: string[];
}
