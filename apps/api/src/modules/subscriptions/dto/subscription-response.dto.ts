import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../../../common/dto/api-response.dto';
import { EntitlementsSummaryDto } from '../../../common/dto/public.dto';

export class PlanDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  amountKobo!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  interval!: string;

  @ApiProperty()
  transcriptAccess!: boolean;

  @ApiProperty()
  downloadAccess!: boolean;

  @ApiProperty()
  adFree!: boolean;

  @ApiProperty()
  enhancedLinking!: boolean;
}

export class PlanListDataDto {
  @ApiProperty({ type: [PlanDto] })
  items!: PlanDto[];
}

export class PlanListResponseDto extends ApiSuccessResponseDto<PlanListDataDto> {
  @ApiProperty({ type: PlanListDataDto })
  override data: PlanListDataDto = undefined as unknown as PlanListDataDto;
}

export class SubscriptionInitializeDto {
  @ApiProperty()
  reference!: string;

  @ApiProperty()
  subscriptionId!: string;

  @ApiProperty({ type: PlanDto })
  plan!: PlanDto;
}

export class SubscriptionInitializeResponseDto extends ApiSuccessResponseDto<SubscriptionInitializeDto> {
  @ApiProperty({ type: SubscriptionInitializeDto })
  override data: SubscriptionInitializeDto = undefined as unknown as SubscriptionInitializeDto;
}

export class SubscriptionVerifyDto {
  @ApiProperty()
  subscriptionId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  planCode!: string;

  @ApiProperty()
  planName!: string;
}

export class SubscriptionVerifyResponseDto extends ApiSuccessResponseDto<SubscriptionVerifyDto> {
  @ApiProperty({ type: SubscriptionVerifyDto })
  override data: SubscriptionVerifyDto = undefined as unknown as SubscriptionVerifyDto;
}

export class SubscriptionSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  planCode!: string;

  @ApiProperty()
  planName!: string;

  @ApiProperty()
  interval!: string;

  @ApiPropertyOptional()
  endsAt?: string | null;
}

export class SubscriptionMeDataDto {
  @ApiProperty({ type: SubscriptionSummaryDto, nullable: true })
  subscription!: SubscriptionSummaryDto | null;

  @ApiProperty({ type: EntitlementsSummaryDto })
  entitlements!: EntitlementsSummaryDto;
}

export class SubscriptionMeResponseDto extends ApiSuccessResponseDto<SubscriptionMeDataDto> {
  @ApiProperty({ type: SubscriptionMeDataDto })
  override data: SubscriptionMeDataDto = undefined as unknown as SubscriptionMeDataDto;
}

export class SubscriptionCancelDto {
  @ApiProperty()
  ok!: boolean;
}

export class SubscriptionCancelResponseDto extends ApiSuccessResponseDto<SubscriptionCancelDto> {
  @ApiProperty({ type: SubscriptionCancelDto })
  override data: SubscriptionCancelDto = undefined as unknown as SubscriptionCancelDto;
}



