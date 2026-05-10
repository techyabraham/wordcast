import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../../../common/dto/api-response.dto';
import { PreacherSummaryDto } from '../../../common/dto/public.dto';

export class ProgramListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  slug?: string;

  @ApiPropertyOptional()
  year?: number | null;

  @ApiPropertyOptional()
  theme?: string | null;

  @ApiPropertyOptional()
  organizer?: string | null;

  @ApiProperty()
  programType!: string;

  @ApiPropertyOptional()
  location?: string | null;

  @ApiPropertyOptional()
  startDate?: Date | null;

  @ApiPropertyOptional()
  endDate?: Date | null;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  coverImage?: string | null;
}

export class ProgramListDataDto {
  @ApiProperty({ type: [ProgramListItemDto] })
  items!: ProgramListItemDto[];
}

export class ProgramListResponseDto extends ApiSuccessResponseDto<ProgramListDataDto> {
  @ApiProperty({ type: ProgramListDataDto })
  override data: ProgramListDataDto = undefined as unknown as ProgramListDataDto;
}

export class ProgramSessionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  dayNumber?: number | null;

  @ApiProperty()
  sessionLabel!: string;

  @ApiProperty()
  sessionOrder!: number;

  @ApiPropertyOptional()
  sessionDate?: Date | null;

  @ApiPropertyOptional()
  startTime?: Date | null;

  @ApiPropertyOptional()
  endTime?: Date | null;
}

export class ProgramSermonGroupDto {
  @ApiPropertyOptional()
  sessionId?: string | null;

  @ApiPropertyOptional()
  sessionName?: string | null;

  @ApiProperty({ type: [Object] })
  sermons!: Array<{ id: string; title: string; preacherName: string | null }>;
}

export class ProgramDetailDto extends ProgramListItemDto {
  @ApiProperty({ type: [ProgramSessionDto] })
  sessions!: ProgramSessionDto[];

  @ApiProperty({ type: [ProgramSermonGroupDto] })
  sermonGroups!: ProgramSermonGroupDto[];

  @ApiProperty({ type: [PreacherSummaryDto] })
  featuredPreachers!: PreacherSummaryDto[];

  @ApiProperty({ type: Object })
  playAll!: { sermonCount: number };
}

export class ProgramDetailResponseDto extends ApiSuccessResponseDto<ProgramDetailDto> {
  @ApiProperty({ type: ProgramDetailDto })
  override data: ProgramDetailDto = undefined as unknown as ProgramDetailDto;
}



