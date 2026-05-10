import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../../../common/dto/api-response.dto';
import { ProgramSummaryDto, TopicSummaryDto } from '../../../common/dto/public.dto';

export class PreacherListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  profileImageUrl?: string | null;

  @ApiPropertyOptional()
  country?: string | null;

  @ApiPropertyOptional()
  followerCount?: number;

  @ApiPropertyOptional()
  ministryName?: string | null;
}

export class PreacherListDataDto {
  @ApiProperty({ type: [PreacherListItemDto] })
  items!: PreacherListItemDto[];
}

export class PreacherListResponseDto extends ApiSuccessResponseDto<PreacherListDataDto> {
  @ApiProperty({ type: PreacherListDataDto })
  override data: PreacherListDataDto = undefined as unknown as PreacherListDataDto;
}

export class PreacherSermonSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  publishedAt?: Date | null;

  @ApiPropertyOptional()
  playCount?: number;
}

export class PreacherDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional()
  biography?: string | null;

  @ApiPropertyOptional()
  profileImageUrl?: string | null;

  @ApiPropertyOptional()
  country?: string | null;

  @ApiPropertyOptional()
  followerCount?: number;

  @ApiPropertyOptional()
  ministryName?: string | null;

  @ApiProperty({ type: [PreacherSermonSummaryDto] })
  topSermons!: PreacherSermonSummaryDto[];

  @ApiProperty({ type: [PreacherSermonSummaryDto] })
  latestSermons!: PreacherSermonSummaryDto[];

  @ApiProperty({ type: [ProgramSummaryDto] })
  relatedPrograms!: ProgramSummaryDto[];

  @ApiProperty({ type: [TopicSummaryDto] })
  topTopics!: TopicSummaryDto[];
}

export class PreacherDetailResponseDto extends ApiSuccessResponseDto<PreacherDetailDto> {
  @ApiProperty({ type: PreacherDetailDto })
  override data: PreacherDetailDto = undefined as unknown as PreacherDetailDto;
}



