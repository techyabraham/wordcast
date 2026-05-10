import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../../../common/dto/api-response.dto';
import { PreacherSummaryDto, ProgramSummaryDto, SoundBiteSummaryDto } from '../../../common/dto/public.dto';

export class TopicListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  isSystem?: boolean;

  @ApiPropertyOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [String] })
  aliases?: string[];
}

export class TopicListDataDto {
  @ApiProperty({ type: [TopicListItemDto] })
  items!: TopicListItemDto[];
}

export class TopicListResponseDto extends ApiSuccessResponseDto<TopicListDataDto> {
  @ApiProperty({ type: TopicListDataDto })
  override data: TopicListDataDto = undefined as unknown as TopicListDataDto;
}

export class TopicSermonSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  publishedAt?: Date | null;
}

export class TopicDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional({ type: [String] })
  aliases?: string[];

  @ApiProperty({ type: [TopicSermonSummaryDto] })
  topSermons!: TopicSermonSummaryDto[];

  @ApiProperty({ type: [PreacherSummaryDto] })
  featuredPreachers!: PreacherSummaryDto[];

  @ApiProperty({ type: [ProgramSummaryDto] })
  relatedPrograms!: ProgramSummaryDto[];

  @ApiProperty({ type: [SoundBiteSummaryDto] })
  soundBites!: SoundBiteSummaryDto[];
}

export class TopicDetailResponseDto extends ApiSuccessResponseDto<TopicDetailDto> {
  @ApiProperty({ type: TopicDetailDto })
  override data: TopicDetailDto = undefined as unknown as TopicDetailDto;
}



