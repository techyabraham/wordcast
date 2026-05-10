import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiMetaDto {
  @ApiPropertyOptional()
  page?: number;

  @ApiPropertyOptional()
  limit?: number;

  @ApiPropertyOptional()
  total?: number;

  @ApiPropertyOptional()
  hasNextPage?: boolean;
}

export class ApiSuccessResponseDto<TData> {
  @ApiProperty({ example: true })
  success!: true;

  @ApiPropertyOptional()
  message?: string;

  @ApiProperty()
  data!: TData;

  @ApiPropertyOptional({ type: ApiMetaDto })
  meta?: ApiMetaDto;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  errorCode!: string;

  @ApiPropertyOptional({ type: Object })
  details?: Record<string, unknown>;
}


