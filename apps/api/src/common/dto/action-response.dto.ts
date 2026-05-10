import { ApiProperty } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from './api-response.dto';

export class OkResponseDataDto {
  @ApiProperty()
  ok!: boolean;
}

export class OkResponseDto extends ApiSuccessResponseDto<OkResponseDataDto> {
  @ApiProperty({ type: OkResponseDataDto })
  override data: OkResponseDataDto = undefined as unknown as OkResponseDataDto;
}



