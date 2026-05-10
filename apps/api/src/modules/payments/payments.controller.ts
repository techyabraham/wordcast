import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PaystackService } from './paystack.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paystackService: PaystackService) {}

  @Post('paystack/webhook')
  @Public()
  @ApiOperation({ summary: 'Paystack webhook handler' })
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: unknown,
    @Headers('x-paystack-signature') signature?: string,
  ) {
    const rawBody = req.rawBody?.toString('utf8') ?? JSON.stringify(body);
    return this.paystackService.handleWebhook(rawBody, signature);
  }
}
