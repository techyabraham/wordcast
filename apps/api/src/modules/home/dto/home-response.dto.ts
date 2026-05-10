import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../../../common/dto/api-response.dto';
import {
  PreacherSummaryDto,
  ProgramSummaryDto,
  SermonSummaryDto,
  SoundBiteSummaryDto,
  TopicSummaryDto,
} from '../../../common/dto/public.dto';
import { LibraryHistoryItemDto } from '../../library/dto/library.dto';

export class HomeFeedDto {
  @ApiPropertyOptional({ type: ProgramSummaryDto, nullable: true })
  featuredProgram?: ProgramSummaryDto | null;

  @ApiProperty({ type: [LibraryHistoryItemDto] })
  continueListening!: LibraryHistoryItemDto[];

  @ApiProperty({ type: [SermonSummaryDto] })
  trendingSermons!: SermonSummaryDto[];

  @ApiProperty({ type: [TopicSummaryDto] })
  featuredTopics!: TopicSummaryDto[];

  @ApiProperty({ type: [ProgramSummaryDto] })
  featuredPrograms!: ProgramSummaryDto[];

  @ApiProperty({ type: [PreacherSummaryDto] })
  featuredPreachers!: PreacherSummaryDto[];

  @ApiProperty({ type: [SoundBiteSummaryDto] })
  soundBitesPreview!: SoundBiteSummaryDto[];

  @ApiProperty({ type: [SermonSummaryDto] })
  newlyAddedSermons!: SermonSummaryDto[];
}

export class HomeResponseDto extends ApiSuccessResponseDto<HomeFeedDto> {
  @ApiProperty({ type: HomeFeedDto })
  override data: HomeFeedDto = undefined as unknown as HomeFeedDto;
}



