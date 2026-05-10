import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlans() {
    const plans = await this.prisma.plan.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ amountKobo: 'asc' }],
    });
    return {
      items: plans.map((plan) => ({
        code: plan.code,
        name: plan.name,
        description: plan.description,
        amountKobo: plan.amountKobo,
        currency: plan.currency,
        interval: plan.interval,
        transcriptAccess: plan.transcriptAccess,
        downloadAccess: plan.downloadAccess,
        adFree: plan.adFree,
        enhancedLinking: plan.enhancedLinking,
      })),
    };
  }

  async subscribe(userId: string, planCode: string) {
    const plan = await this.prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan || plan.status !== 'ACTIVE') {
      throw new NotFoundException('Plan not found');
    }

    const now = new Date();
    const endsAt = new Date(now);

    if (plan.interval === 'MONTHLY') {
      endsAt.setMonth(endsAt.getMonth() + 1);
    } else if (plan.interval === 'YEARLY') {
      endsAt.setFullYear(endsAt.getFullYear() + 1);
    } else {
      endsAt.setFullYear(endsAt.getFullYear() + 50);
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        status: 'TRIAL',
        startsAt: now,
        endsAt,
        metadata: {
          source: 'manual_scaffold',
        },
      },
    });

    await this.syncPlanEntitlements(userId, plan.id);

    return subscription;
  }

  async initializeCheckout(userId: string, planCode: string) {
    const plan = await this.prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan || plan.status !== 'ACTIVE') {
      throw new NotFoundException('Plan not found');
    }

    const reference = randomUUID();
    const now = new Date();
    const endsAt = new Date(now);

    if (plan.interval === 'MONTHLY') {
      endsAt.setMonth(endsAt.getMonth() + 1);
    } else if (plan.interval === 'YEARLY') {
      endsAt.setFullYear(endsAt.getFullYear() + 1);
    } else {
      endsAt.setFullYear(endsAt.getFullYear() + 50);
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        status: 'TRIAL',
        startsAt: now,
        endsAt,
        metadata: {
          checkoutReference: reference,
          provider: 'manual',
          state: 'initialized',
        },
      },
    });

    return {
      reference,
      subscriptionId: subscription.id,
      plan: {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        amountKobo: plan.amountKobo,
        currency: plan.currency,
        interval: plan.interval,
        transcriptAccess: plan.transcriptAccess,
        downloadAccess: plan.downloadAccess,
        adFree: plan.adFree,
        enhancedLinking: plan.enhancedLinking,
      },
    };
  }

  async verifyCheckout(userId: string, reference: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        metadata: {
          path: ['checkoutReference'],
          equals: reference,
        },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription reference not found');
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        metadata: {
          ...(subscription.metadata as Record<string, unknown>),
          state: 'verified',
        },
      },
    });

    await this.syncPlanEntitlements(userId, subscription.planId);

    return {
      subscriptionId: subscription.id,
      status: 'ACTIVE',
      planCode: subscription.plan.code,
      planName: subscription.plan.name,
    };
  }

  async syncPlanEntitlements(userId: string, planId: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const entitlementData = [
      { type: 'TRANSCRIPT_ACCESS', enabled: plan.transcriptAccess },
      { type: 'DOWNLOAD_ACCESS', enabled: plan.downloadAccess },
      { type: 'AD_FREE', enabled: plan.adFree },
      { type: 'ENHANCED_LINKING', enabled: plan.enhancedLinking },
    ] as const;

    await this.prisma.$transaction(
      entitlementData
        .filter((entry) => entry.enabled)
        .map((entry) =>
          this.prisma.userEntitlement.upsert({
            where: {
              userId_type_source: {
                userId,
                type: entry.type,
                source: 'PLAN',
              },
            },
            create: {
              userId,
              type: entry.type,
              source: 'PLAN',
              isActive: true,
            },
            update: {
              isActive: true,
            },
          }),
        ),
    );
  }

  async assertEntitlement(userId: string, type: 'TRANSCRIPT_ACCESS' | 'DOWNLOAD_ACCESS' | 'AD_FREE' | 'ENHANCED_LINKING') {
    const entitlement = await this.prisma.userEntitlement.findFirst({
      where: {
        userId,
        type,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (!entitlement) {
      throw new ForbiddenException('Premium entitlement required');
    }

    return true;
  }

  async getEntitlementSummary(userId: string) {
    const entitlements = await this.prisma.userEntitlement.findMany({
      where: {
        userId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        type: true,
        isActive: true,
      },
    });

    const active = new Set(entitlements.filter((e) => e.isActive).map((e) => e.type));
    return {
      transcriptAccess: active.has('TRANSCRIPT_ACCESS'),
      downloadAccess: active.has('DOWNLOAD_ACCESS'),
      adFree: active.has('AD_FREE'),
      enhancedLinking: active.has('ENHANCED_LINKING'),
    };
  }

  async getCurrentSubscriptionSummary(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] } },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      return null;
    }

    return {
      id: subscription.id,
      status: subscription.status,
      planCode: subscription.plan.code,
      planName: subscription.plan.name,
      interval: subscription.plan.interval,
      endsAt: subscription.endsAt?.toISOString() ?? null,
    };
  }

  async getSubscriptionState(userId: string) {
    const [subscription, entitlements] = await Promise.all([
      this.getCurrentSubscriptionSummary(userId),
      this.getEntitlementSummary(userId),
    ]);

    return {
      subscription,
      entitlements,
    };
  }

  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });

    return { ok: true };
  }
}
