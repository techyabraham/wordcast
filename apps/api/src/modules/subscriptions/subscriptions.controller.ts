import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import {
  type CancelSubscriptionDto, InitializeSubscriptionDto, SubscribeDto, VerifySubscriptionDto,
} from './dto/subscribe.dto';
import {
  PlanListResponseDto,
  SubscriptionCancelResponseDto,
  SubscriptionInitializeResponseDto,
  SubscriptionMeResponseDto,
  SubscriptionVerifyResponseDto,
} from './dto/subscription-response.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @Public()
  @ApiOperation({ summary: 'List active subscription plans' })
  @ApiOkResponse({ type: PlanListResponseDto })
  listPlans() {
    return this.subscriptionsService.listPlans();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create user subscription scaffold' })
  subscribe(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubscribeDto) {
    return this.subscriptionsService.subscribe(user.id, dto.planCode);
  }

  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize subscription checkout' })
  @ApiOkResponse({ type: SubscriptionInitializeResponseDto })
  initialize(@CurrentUser() user: AuthenticatedUser, @Body() dto: InitializeSubscriptionDto) {
    return this.subscriptionsService.initializeCheckout(user.id, dto.planCode);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify subscription payment reference' })
  @ApiOkResponse({ type: SubscriptionVerifyResponseDto })
  verify(@CurrentUser() user: AuthenticatedUser, @Body() dto: VerifySubscriptionDto) {
    return this.subscriptionsService.verifyCheckout(user.id, dto.reference);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current subscription' })
  @ApiOkResponse({ type: SubscriptionMeResponseDto })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getSubscriptionState(user.id);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel active subscription' })
  @ApiOkResponse({ type: SubscriptionCancelResponseDto })
  cancel(@CurrentUser() user: AuthenticatedUser, @Body() _dto: CancelSubscriptionDto) {
    return this.subscriptionsService.cancelSubscription(user.id);
  }
}
