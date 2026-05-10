import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SubscribeDto {
  @ApiProperty()
  @IsString()
  planCode!: string;
}

export class InitializeSubscriptionDto {
  @ApiProperty()
  @IsString()
  planCode!: string;
}

export class VerifySubscriptionDto {
  @ApiProperty()
  @IsString()
  reference!: string;
}

export class CancelSubscriptionDto {
  @ApiProperty()
  @IsString()
  reason!: string;
}
