import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AppEnv } from '@wordcast/config';
import { createHmac } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class PaystackService {
  constructor(
    private readonly configService: ConfigService<AppEnv>,
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  verifyWebhookSignature(rawBody: string, signature?: string): boolean {
    if (!signature) {
      return false;
    }

    const secret = this.configService.getOrThrow<string>('PAYSTACK_WEBHOOK_SECRET');
    const computed = createHmac('sha512', secret).update(rawBody).digest('hex');
    return computed === signature;
  }

  async handleWebhook(rawBody: string, signature?: string) {
    if (!this.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody) as {
      event: string;
      id?: string;
      data: {
        customer?: { email?: string; customer_code?: string };
        plan?: { plan_code?: string };
        subscription_code?: string;
        status?: string;
      };
    };

    // Deduplicate using Paystack's event id to prevent double-processing on retries
    const eventId = payload.id ?? `${payload.event}:${payload.data.subscription_code ?? ''}`;
    const alreadyProcessed = await this.prisma.webhookEvent.findUnique({
      where: { provider_eventId: { provider: 'paystack', eventId } },
      select: { id: true },
    });

    if (alreadyProcessed) {
      return { ok: true, duplicate: true };
    }

    await this.prisma.webhookEvent.create({
      data: { provider: 'paystack', eventId, eventType: payload.event },
    });

    if (payload.event === 'subscription.create' || payload.event === 'subscription.enable') {
      const email = payload.data.customer?.email?.toLowerCase();
      const planCode = payload.data.plan?.plan_code;

      if (!email || !planCode) {
        return { ok: true };
      }

      const [user, plan] = await Promise.all([
        this.prisma.user.findUnique({ where: { email } }),
        this.prisma.plan.findFirst({ where: { paystackPlanCode: planCode } }),
      ]);

      if (!user || !plan) {
        return { ok: true };
      }

      await this.prisma.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: payload.data.status === 'active' ? 'ACTIVE' : 'TRIAL',
          startsAt: new Date(),
          ...(payload.data.customer?.customer_code !== undefined
            ? { paystackCustomerCode: payload.data.customer.customer_code }
            : {}),
          ...(payload.data.subscription_code !== undefined
            ? { paystackSubscriptionCode: payload.data.subscription_code }
            : {}),
          metadata: payload as Prisma.InputJsonValue,
        } satisfies Prisma.SubscriptionUncheckedCreateInput,
      });

      await this.subscriptionsService.syncPlanEntitlements(user.id, plan.id);
    }

    if (payload.event === 'subscription.disable') {
      const subscriptionCode = payload.data.subscription_code;
      if (subscriptionCode) {
        await this.prisma.subscription.updateMany({
          where: { paystackSubscriptionCode: subscriptionCode },
          data: {
            status: 'CANCELED',
            canceledAt: new Date(),
          },
        });
      }
    }

    return { ok: true };
  }
}
