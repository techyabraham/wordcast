import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { SessionLabel } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty()
  @IsString()
  programId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  dayNumber?: number;

  @ApiProperty({ enum: SessionLabel })
  @IsEnum(SessionLabel)
  sessionLabel!: SessionLabel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customLabel?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  sessionOrder!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  sessionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endTime?: string;
}

export class UpdateSessionDto extends PartialType(CreateSessionDto) {}
