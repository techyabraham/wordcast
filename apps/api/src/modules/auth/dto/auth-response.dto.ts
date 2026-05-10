import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../../../common/dto/api-response.dto';
import { EntitlementsSummaryDto } from '../../../common/dto/public.dto';

export class AuthTokensDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty()
  accessTokenExpiresIn!: string;

  @ApiProperty()
  refreshTokenExpiresAt!: string;
}

export class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ type: [String] })
  roles!: string[];

  @ApiProperty({ type: [String] })
  permissions!: string[];
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

export class AuthResponseDataDto {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty({ type: AuthTokensDto })
  tokens!: AuthTokensDto;

  @ApiPropertyOptional({ type: SubscriptionSummaryDto, nullable: true })
  subscription?: SubscriptionSummaryDto | null;

  @ApiProperty({ type: EntitlementsSummaryDto })
  entitlements!: EntitlementsSummaryDto;
}

export class AuthResponseDto extends ApiSuccessResponseDto<AuthResponseDataDto> {
  @ApiProperty({ type: AuthResponseDataDto })
  override data: AuthResponseDataDto = undefined as unknown as AuthResponseDataDto;
}

export class ProfileDataDto {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiPropertyOptional({ type: SubscriptionSummaryDto, nullable: true })
  subscription?: SubscriptionSummaryDto | null;

  @ApiProperty({ type: EntitlementsSummaryDto })
  entitlements!: EntitlementsSummaryDto;
}

export class ProfileResponseDto extends ApiSuccessResponseDto<ProfileDataDto> {
  @ApiProperty({ type: ProfileDataDto })
  override data: ProfileDataDto = undefined as unknown as ProfileDataDto;
}



