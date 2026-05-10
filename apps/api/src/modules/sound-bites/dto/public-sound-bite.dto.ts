import { ApiProperty } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../../../common/dto/api-response.dto';
import { SoundBiteSummaryDto } from '../../../common/dto/public.dto';

export class SoundBiteListDataDto {
  @ApiProperty({ type: [SoundBiteSummaryDto] })
  items!: SoundBiteSummaryDto[];
}

export class SoundBiteListResponseDto extends ApiSuccessResponseDto<SoundBiteListDataDto> {
  @ApiProperty({ type: SoundBiteListDataDto })
  override data: SoundBiteListDataDto = undefined as unknown as SoundBiteListDataDto;
}

export class SoundBiteDetailResponseDto extends ApiSuccessResponseDto<SoundBiteSummaryDto> {
  @ApiProperty({ type: SoundBiteSummaryDto })
  override data: SoundBiteSummaryDto = undefined as unknown as SoundBiteSummaryDto;
}



