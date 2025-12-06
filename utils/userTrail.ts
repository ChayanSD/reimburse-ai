import prisma from "@/lib/prisma";
import { Prisma } from '../app/generated/prisma/client';

interface UserSubscriptionInfo {
  tier: string;
  status: string;
  trialEnd: Date | null;
  subscriptionEnd: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  earlyAdopter: boolean | null;
  lifetimeDiscount: Prisma.Decimal | null;
  features: Prisma.JsonValue;
  maxReceipts: number;
  maxReports: number;
  usageReceipts: number;
  usageReports: number;
}

interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: {
      customer?: string;
      id: string;
      status: string;
      items?: {
        data: Array<{
          price: {
            id: string;
          };
        }>;
      } | null;
    };
  };
}


export async function initializeUserTrial(userId: number): Promise<void> {
  const userCount = await prisma.authUser.count();
  const isEarlyAdopter = userCount <= 200;

  await prisma.$transaction(async (tx) => {
    // Update user with trial information
    await tx.authUser.update({
      where: { id: userId },
      data: {
        subscriptionTier: 'free',
        subscriptionStatus: 'trial',
        trialStart: new Date(),
        trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        earlyAdopter: isEarlyAdopter,
      },
    });

    // Initialize usage tracking
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    await tx.subscriptionUsage.createMany({
      data: [
        {
          userId,
          feature: 'receipt_uploads',
          usageCount: 0,
          resetDate: new Date(),
          resetDay: currentDate,
        },
        {
          userId,
          feature: 'report_exports',
          usageCount: 0,
          resetDate: new Date(),
          resetDay: currentDate,
        },
      ],
    });

    // Log subscription event
    await tx.subscriptionEvent.create({
      data: {
        userId,
        eventType: 'trial_started',
        newTier: 'free',
        newStatus: 'trial',
      },
    });
  });
}

/**
 * Check if user can perform an action based on subscription limits
 * Equivalent to check_subscription_limit() SQL function
 */
export async function checkSubscriptionLimit(
  userId: number,
  feature: string
): Promise<boolean> {
  return await prisma.$transaction(async (tx) => {
    // Get user subscription info
    const user = await tx.authUser.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        trialEnd: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    let { subscriptionTier, subscriptionStatus } = user;

    // Check if trial expired
    if (subscriptionStatus === 'trial' && user.trialEnd) {
      if (user.trialEnd < new Date()) {
        // Trial expired, downgrade to free
        await tx.authUser.update({
          where: { id: userId },
          data: {
            subscriptionStatus: 'canceled',
            subscriptionTier: 'free',
          },
        });
        subscriptionTier = 'free';
        subscriptionStatus = 'canceled';
      }
    }

    // Get tier configuration
    const tierConfig = await tx.subscriptionTier.findUnique({
      where: { tierName: subscriptionTier },
      select: {
        maxReceipts: true,
        maxReports: true,
      },
    });

    if (!tierConfig) {
      throw new Error('Subscription tier not found');
    }

    // Get current usage
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const usage = await tx.subscriptionUsage.findUnique({
      where: {
        userId_feature_resetDay: {
          userId,
          feature,
          resetDay: currentDate,
        },
      },
      select: { usageCount: true },
    });

    const currentUsage = usage?.usageCount ?? 0;

    // Determine max allowed based on feature
    let maxAllowed: number | null;
    switch (feature) {
      case 'receipt_uploads':
        maxAllowed = tierConfig.maxReceipts;
        break;
      case 'report_exports':
        maxAllowed = tierConfig.maxReports;
        break;
      default:
        maxAllowed = -1; // Unlimited
    }

    // Return true if unlimited or under limit
    return maxAllowed === -1 || maxAllowed === null || currentUsage < maxAllowed;
  });
}

/**
 * Increment usage counter for a feature
 * Equivalent to increment_subscription_usage() SQL function
 */
export async function incrementSubscriptionUsage(
  userId: number,
  feature: string
): Promise<void> {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  await prisma.subscriptionUsage.upsert({
    where: {
      userId_feature_resetDay: {
        userId,
        feature,
        resetDay: currentDate,
      },
    },
    update: {
      usageCount: {
        increment: 1,
      },
      updatedAt: new Date(),
    },
    create: {
      userId,
      feature,
      usageCount: 1,
      resetDate: new Date(),
      resetDay: currentDate,
    },
  });
}

/**
 * Get comprehensive subscription information for a user
 * Equivalent to get_user_subscription_info() SQL function
 */
export async function getUserSubscriptionInfo(userId: number): Promise<UserSubscriptionInfo> {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const result = await prisma.authUser.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
      subscriptionStatus: true,
      trialEnd: true,
      subscriptionEndsAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      earlyAdopter: true,
      lifetimeDiscount: true,
      subscriptionUsage: {
        where: {
          resetDay: currentDate,
          feature: {
            in: ['receipt_uploads', 'report_exports'],
          },
        },
        select: {
          feature: true,
          usageCount: true,
        },
      },
    },
  });

  if (!result) {
    throw new Error('User not found');
  }

  // Get tier features
  const tier = await prisma.subscriptionTier.findUnique({
    where: { tierName: result.subscriptionTier },
    select: {
      features: true,
      maxReceipts: true,
      maxReports: true,
    },
  });

  // Map usage to specific features
  const usageReceipts =
    result.subscriptionUsage.find((u) => u.feature === 'receipt_uploads')
      ?.usageCount ?? 0;
  const usageReports =
    result.subscriptionUsage.find((u) => u.feature === 'report_exports')
      ?.usageCount ?? 0;

  return {
    tier: result.subscriptionTier,
    status: result.subscriptionStatus,
    trialEnd: result.trialEnd,
    subscriptionEnd: result.subscriptionEndsAt,
    stripeCustomerId: result.stripeCustomerId,
    stripeSubscriptionId: result.stripeSubscriptionId,
    earlyAdopter: result.earlyAdopter,
    lifetimeDiscount: result.lifetimeDiscount,
    features: tier?.features ?? [],
    maxReceipts: tier?.maxReceipts ?? -1,
    maxReports: tier?.maxReports ?? -1,
    usageReceipts,
    usageReports,
  };
}

/**
 * Update user subscription tier
 * Handles tier upgrades/downgrades with event logging
 */
export async function updateSubscriptionTier(
  userId: number,
  newTier: string,
  newStatus: string,
  stripeSubscriptionId?: string,
  stripeEventId?: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Get current subscription info
    const currentUser = await tx.authUser.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
      },
    });

    if (!currentUser) {
      throw new Error('User not found');
    }

    // Update user subscription
    await tx.authUser.update({
      where: { id: userId },
      data: {
        subscriptionTier: newTier,
        subscriptionStatus: newStatus,
        stripeSubscriptionId: stripeSubscriptionId,
        subscriptionEndsAt:
          newStatus === 'active'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            : undefined,
      },
    });

    // Log subscription event
    await tx.subscriptionEvent.create({
      data: {
        userId,
        eventType: 'subscription_changed',
        oldTier: currentUser.subscriptionTier,
        newTier,
        oldStatus: currentUser.subscriptionStatus,
        newStatus,
        stripeEventId,
      },
    });
  });
}

/**
 * Handle Stripe webhook events
 * Process subscription updates from Stripe
 */
export async function handleStripeWebhook(
  event: StripeWebhookEvent
): Promise<void> {
  const { type, data } = event;
  const subscription = data.object;

  switch (type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const user = await prisma.authUser.findFirst({
        where: { stripeCustomerId: subscription.customer },
      });

      if (!user) {
        throw new Error('User not found for Stripe customer');
      }

      // Determine tier from price ID
      const priceId = subscription.items?.data[0]?.price.id;
      const tier = await prisma.subscriptionTier.findFirst({
        where: {
          OR: [
            { stripePriceIdMonthly: priceId },
            { stripePriceIdYearly: priceId },
          ],
        },
      });

      if (!tier) {
        throw new Error('Subscription tier not found for price ID');
      }

      await updateSubscriptionTier(
        user.id,
        tier.tierName,
        subscription.status,
        subscription.id,
        event.id
      );
      break;
    }

    case 'customer.subscription.deleted': {
      const user = await prisma.authUser.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });

      if (user) {
        await updateSubscriptionTier(
          user.id,
          'free',
          'canceled',
          undefined,
          event.id
        );
      }
      break;
    }

    default:
      console.log(`Unhandled webhook event type: ${type}`);
  }
}

/**
 * Check and enforce subscription limits before action
 * Returns true if action is allowed, throws error if limit reached
 */
export async function enforceSubscriptionLimit(
  userId: number,
  feature: string
): Promise<void> {
  const allowed = await checkSubscriptionLimit(userId, feature);
  
  if (!allowed) {
    const info = await getUserSubscriptionInfo(userId);
    
    let limitMessage = '';
    if (feature === 'receipt_uploads') {
      limitMessage = `You've reached your limit of ${info.maxReceipts} receipt uploads for today.`;
    } else if (feature === 'report_exports') {
      limitMessage = `You've reached your limit of ${info.maxReports} report exports for today.`;
    } else {
      limitMessage = 'You have reached your subscription limit for this feature.';
    }
    
    throw new Error(`${limitMessage} Please upgrade your plan to continue.`);
  }
}

/**
 * Process receipt upload with subscription limit check
 */
export async function processReceiptUpload(
  userId: number,
  receiptData: Prisma.ReceiptCreateInput
): Promise<void> {
  await enforceSubscriptionLimit(userId, 'receipt_uploads');
  
  await prisma.$transaction(async (tx) => {
    // Create receipt
    await tx.receipt.create({
      data: receiptData,
    });

    // Increment usage
    await incrementSubscriptionUsage(userId, 'receipt_uploads');

    // Log audit event
    await tx.auditLog.create({
      data: {
        userId,
        eventType: 'receipt_uploaded',
        eventData: {
          merchant: (receiptData as { merchantName: string }).merchantName,
          amount: (receiptData as { amount: Prisma.Decimal }).amount,
        },
      },
    });
  });
}

/**
 * Generate report with subscription limit check
 */
export async function generateReport(
  userId: number,
  reportData: Prisma.ReportCreateInput
): Promise<void> {
  await enforceSubscriptionLimit(userId, 'report_exports');
  
  await prisma.$transaction(async (tx) => {
    // Create report
    await tx.report.create({
      data: reportData,
    });

    // Increment usage
    await incrementSubscriptionUsage(userId, 'report_exports');

    // Log audit event
    await tx.auditLog.create({
      data: {
        userId,
        eventType: 'report_generated',
        eventData: {
          periodStart: (reportData as { periodStart: Date }).periodStart,
          periodEnd: (reportData as { periodEnd: Date }).periodEnd,
          totalAmount: (reportData as { totalAmount: Prisma.Decimal }).totalAmount,
        },
      },
    });
  });
}

/**
 * Reset daily usage counters (run via cron job)
 */
export async function resetDailyUsage(): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  // Delete old usage records (keep only last 7 days)
  await prisma.subscriptionUsage.deleteMany({
    where: {
      resetDay: {
        lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
  });
}

/**
 * Check and expire trials (run via cron job)
 */
export async function expireTrials(): Promise<void> {
  const expiredUsers = await prisma.authUser.findMany({
    where: {
      subscriptionStatus: 'trial',
      trialEnd: {
        lt: new Date(),
      },
    },
  });

  for (const user of expiredUsers) {
    await updateSubscriptionTier(
      user.id,
      'free',
      'canceled'
    );
  }
}

/**
 * Create referral code for user
 */
export async function createReferralCode(userId: number): Promise<string> {
  const code = `REF${userId}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  await prisma.authUser.update({
    where: { id: userId },
    data: { referralCode: code },
  });
  
  return code;
}

/**
 * Process referral
 */
export async function processReferral(
  referralCode: string,
  newUserId: number
): Promise<void> {
  const referrer = await prisma.authUser.findUnique({
    where: { referralCode },
  });

  if (!referrer) {
    throw new Error('Invalid referral code');
  }

  await prisma.referralTracking.create({
    data: {
      referrerId: referrer.id,
      referredId: newUserId,
      referralCode,
      status: 'pending',
      rewardType: 'discount',
      rewardValue: new Prisma.Decimal(10.00),
    },
  });
}
