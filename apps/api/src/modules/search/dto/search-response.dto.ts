import { ApiProperty } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../../../common/dto/api-response.dto';
import {
  PreacherSummaryDto,
  ProgramSummaryDto,
  SermonSummaryDto,
  TopicSummaryDto,
} from '../../../common/dto/public.dto';

export class SearchResultsDto {
  @ApiProperty({ type: [SermonSummaryDto] })
  sermons!: SermonSummaryDto[];

  @ApiProperty({ type: [PreacherSummaryDto] })
  preachers!: PreacherSummaryDto[];

  @ApiProperty({ type: [ProgramSummaryDto] })
  programs!: ProgramSummaryDto[];

  @ApiProperty({ type: [TopicSummaryDto] })
  topics!: TopicSummaryDto[];
}

export class SearchResponseDto extends ApiSuccessResponseDto<SearchResultsDto> {
  @ApiProperty({ type: SearchResultsDto })
  override data: SearchResultsDto = undefined as unknown as SearchResultsDto;
}

export class SearchSuggestionsDto extends SearchResultsDto {}

export class SearchSuggestionsResponseDto extends ApiSuccessResponseDto<SearchSuggestionsDto> {
  @ApiProperty({ type: SearchSuggestionsDto })
  override data: SearchSuggestionsDto = undefined as unknown as SearchSuggestionsDto;
}



