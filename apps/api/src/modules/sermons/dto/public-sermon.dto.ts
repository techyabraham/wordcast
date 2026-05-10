import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../../../common/dto/api-response.dto';
import { SoundBiteSummaryDto, SermonSummaryDto } from '../../../common/dto/public.dto';

export class SermonListDataDto {
  @ApiProperty({ type: [SermonSummaryDto] })
  items!: SermonSummaryDto[];
}

export class SermonListResponseDto extends ApiSuccessResponseDto<SermonListDataDto> {
  @ApiProperty({ type: SermonListDataDto })
  override data: SermonListDataDto = undefined as unknown as SermonListDataDto;
}

export class SermonDetailDto extends SermonSummaryDto {
  @ApiPropertyOptional()
  transcriptPreview?: string | null;

  @ApiPropertyOptional({ type: [SoundBiteSummaryDto] })
  soundBites?: SoundBiteSummaryDto[];
}

export class SermonDetailResponseDto extends ApiSuccessResponseDto<SermonDetailDto> {
  @ApiProperty({ type: SermonDetailDto })
  override data: SermonDetailDto = undefined as unknown as SermonDetailDto;
}

export class SermonRelatedResponseDto extends ApiSuccessResponseDto<SermonListDataDto> {
  @ApiProperty({ type: SermonListDataDto })
  override data: SermonListDataDto = undefined as unknown as SermonListDataDto;
}

export class SermonTranscriptDto {
  @ApiProperty()
  sermonId!: string;

  @ApiProperty()
  language!: string;

  @ApiPropertyOptional()
  durationSeconds?: number | null;

  @ApiProperty()
  fullText!: string;

  @ApiProperty({ type: [Object] })
  segments!: Array<{ start: number; end: number; text: string }>;

  @ApiPropertyOptional()
  createdAt?: Date;
}

export class SermonTranscriptResponseDto extends ApiSuccessResponseDto<SermonTranscriptDto> {
  @ApiProperty({ type: SermonTranscriptDto })
  override data: SermonTranscriptDto = undefined as unknown as SermonTranscriptDto;
}

export class SermonDownloadDto {
  @ApiProperty()
  downloadUrl!: string | null;
}

export class SermonDownloadResponseDto extends ApiSuccessResponseDto<SermonDownloadDto> {
  @ApiProperty({ type: SermonDownloadDto })
  override data: SermonDownloadDto = undefined as unknown as SermonDownloadDto;
}



