import { getSession } from './session';
import prisma from './prisma';

const unauthorized = () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
// const forbidden = () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
const paymentRequired = (message: string, data?: Record<string, unknown>) => new Response(JSON.stringify({ error: message, ...data }), { status: 402 });
const internalServerError = (message: string = 'Internal server error') => new Response(JSON.stringify({ error: message }), { status: 500 });

export interface SubscriptionInfo {
  tier: string;
  status: string;
  trialEnd?: Date;
  subscriptionEnd?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  earlyAdopter: boolean;
  lifetimeDiscount: number;
  features: string[];
  usageReceipts: number;
  usageReports: number;
}

export interface SubscriptionLimits {
  maxReceipts: number;
  maxReports: number;
  hasEmailIngestion: boolean;
  hasTeamCollaboration: boolean;
  hasAnalytics: boolean;
  hasCustomBranding: boolean;
  hasCSVExport: boolean;
  hasPriorityProcessing: boolean;
}

// Get user subscription information
export async function getUserSubscriptionInfo(userId: number): Promise<SubscriptionInfo | null> {
  try {
    const user = await prisma.authUser.findUnique({
      where: { id: userId },
    });
    if (!user) return null;

    const tier = await prisma.subscriptionTier.findUnique({
      where: { tierName: user.subscriptionTier },
    });

    const usageReceiptsAgg = await prisma.subscriptionUsage.aggregate({
      where: { userId, feature: 'receipt_uploads' },
      _sum: { usageCount: true },
    });
    const usageReportsAgg = await prisma.subscriptionUsage.aggregate({
      where: { userId, feature: 'report_exports' },
      _sum: { usageCount: true },
    });

    const usageReceipts = usageReceiptsAgg._sum.usageCount || 0;
    const usageReports = usageReportsAgg._sum.usageCount || 0;

    return {
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
      trialEnd: user.trialEnd || undefined,
      subscriptionEnd: user.subscriptionEndsAt || undefined,
      stripeCustomerId: user.stripeCustomerId || undefined,
      stripeSubscriptionId: user.stripeSubscriptionId || undefined,
      earlyAdopter: user.earlyAdopter,
      lifetimeDiscount: Number(user.lifetimeDiscount),
      features: (tier?.features as string[]) || [],
      usageReceipts,
      usageReports,
    };
  } catch (error) {
    console.error('Error getting subscription info:', error);
    return null;
  }
}

// Get subscription limits based on tier
export function getSubscriptionLimits(tier: string): SubscriptionLimits {
  const limits: Record<string, SubscriptionLimits> = {
    free: {
      maxReceipts: 10,
      maxReports: 1,
      hasEmailIngestion: false,
      hasTeamCollaboration: false,
      hasAnalytics: false,
      hasCustomBranding: false,
      hasCSVExport: false,
      hasPriorityProcessing: false,
    },
    pro: {
      maxReceipts: -1, // Unlimited
      maxReports: -1, // Unlimited
      hasEmailIngestion: false,
      hasTeamCollaboration: false,
      hasAnalytics: false,
      hasCustomBranding: true,
      hasCSVExport: true,
      hasPriorityProcessing: true,
    },
    premium: {
      maxReceipts: -1, // Unlimited
      maxReports: -1, // Unlimited
      hasEmailIngestion: true,
      hasTeamCollaboration: true,
      hasAnalytics: true,
      hasCustomBranding: true,
      hasCSVExport: true,
      hasPriorityProcessing: true,
    },
  };
  
  return limits[tier] || limits.free;
}

// Check if user can perform an action
export async function checkSubscriptionLimit(
  userId: number,
  feature: 'receipt_uploads' | 'report_exports' | 'email_ingestion' | 'team_collaboration' | 'analytics' | 'custom_branding' | 'csv_export' | 'priority_processing'
): Promise<{ allowed: boolean; reason?: string; upgradeRequired?: string; currentTier?: string }> {
  try {
    const subscription = await getUserSubscriptionInfo(userId);
    if (!subscription) {
      return { allowed: false, reason: 'User not found', currentTier: 'free' };
    }

    // Check if trial has expired
    if (subscription.status === 'trial' && subscription.trialEnd && subscription.trialEnd < new Date()) {
      // Auto-downgrade expired trial
      await prisma.authUser.update({
        where: { id: userId },
        data: {
          subscriptionStatus: 'canceled',
          subscriptionTier: 'free',
        },
      });
      subscription.status = 'canceled';
      subscription.tier = 'free';
    }

    const limits = getSubscriptionLimits(subscription.tier);

    // Check feature-specific limits
    switch (feature) {
      case 'receipt_uploads':
        if (limits.maxReceipts === -1) return { allowed: true };
        if (subscription.usageReceipts >= limits.maxReceipts) {
          return {
            allowed: false,
            reason: `Upload limit reached (${limits.maxReceipts}). Upgrade to Pro for unlimited uploads.`,
            upgradeRequired: 'pro',
            currentTier: subscription.tier
          };
        }
        return { allowed: true };

      case 'report_exports':
        if (limits.maxReports === -1) return { allowed: true };
        if (subscription.usageReports >= limits.maxReports) {
          return {
            allowed: false,
            reason: `Report limit reached (${limits.maxReports}). Upgrade to Pro for unlimited reports.`,
            upgradeRequired: 'pro',
            currentTier: subscription.tier
          };
        }
        return { allowed: true };

      case 'email_ingestion':
        if (!limits.hasEmailIngestion) {
          return {
            allowed: false,
            reason: 'Email receipt ingestion requires Premium subscription.',
            upgradeRequired: 'premium',
            currentTier: subscription.tier
          };
        }
        return { allowed: true };

      case 'team_collaboration':
        if (!limits.hasTeamCollaboration) {
          return {
            allowed: false,
            reason: 'Team collaboration requires Premium subscription.',
            upgradeRequired: 'premium',
            currentTier: subscription.tier
          };
        }
        return { allowed: true };

      case 'analytics':
        if (!limits.hasAnalytics) {
          return {
            allowed: false,
            reason: 'Analytics dashboard requires Premium subscription.',
            upgradeRequired: 'premium',
            currentTier: subscription.tier
          };
        }
        return { allowed: true };

      case 'custom_branding':
        if (!limits.hasCustomBranding) {
          return {
            allowed: false,
            reason: 'Custom branding requires Pro subscription.',
            upgradeRequired: 'pro',
            currentTier: subscription.tier
          };
        }
        return { allowed: true };

      case 'csv_export':
        if (!limits.hasCSVExport) {
          return {
            allowed: false,
            reason: 'CSV export requires Pro subscription.',
            upgradeRequired: 'pro',
            currentTier: subscription.tier
          };
        }
        return { allowed: true };

      case 'priority_processing':
        if (!limits.hasPriorityProcessing) {
          return {
            allowed: false,
            reason: 'Priority processing requires Pro subscription.',
            upgradeRequired: 'pro',
            currentTier: subscription.tier
          };
        }
        return { allowed: true };

      default:
        return { allowed: false, reason: 'Unknown feature', currentTier: subscription.tier };
    }
  } catch (error) {
    console.error('Error checking subscription limit:', error);
    return { allowed: false, reason: 'Internal error' };
  }
}

// Increment usage counter
export async function incrementUsage(userId: number, feature: 'receipt_uploads' | 'report_exports'): Promise<void> {
  try {
    const now = new Date();
    const resetDay = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
    await prisma.subscriptionUsage.upsert({
      where: {
        userId_feature_resetDay: {
          userId,
          feature,
          resetDay,
        },
      },
      update: {
        usageCount: { increment: 1 },
      },
      create: {
        userId,
        feature,
        usageCount: 1,
        resetDate: now,
        resetDay,
      },
    });
  } catch (error) {
    console.error('Error incrementing usage:', error);
  }
}

// Middleware function for API routes
export function withSubscriptionCheck(
  feature: 'receipt_uploads' | 'report_exports' | 'email_ingestion' | 'team_collaboration' | 'analytics' | 'custom_branding' | 'csv_export' | 'priority_processing'
) {
  return function(handler: (request: Request, auth: { userId: number, email: string, name?: string }, subscription: SubscriptionInfo) => Promise<Response>) {
    return async (request: Request) => {
      try {
        // Get authenticated user
        const user = await getSession();
        if (!user) {
          return unauthorized();
        }

        // Get full subscription info
        const subscription = await getUserSubscriptionInfo(user.id);
        if (!subscription) {
          return internalServerError('Failed to get subscription information');
        }

        // Check subscription limits
        const limitCheck = await checkSubscriptionLimit(user.id, feature);
        if (!limitCheck.allowed) {
          return paymentRequired(limitCheck.reason || 'Subscription limit reached', {
            upgradeRequired: limitCheck.upgradeRequired,
            currentTier: limitCheck.currentTier || subscription.tier,
          });
        }

        // Call the original handler
        return handler(request, { userId: user.id, email: user.email, name: user.name }, subscription);
      } catch (error) {
        console.error('Subscription check error:', error);
        return internalServerError('Subscription check failed');
      }
    };
  };
}

// Helper to get pricing information
export async function getPricingInfo() {
  try {
    const tiers = await prisma.subscriptionTier.findMany({
      orderBy: { monthlyPriceCents: 'asc' },
    });

    return tiers.map(tier => ({
      id: tier.tierName,
      name: tier.displayName,
      monthlyPrice: tier.monthlyPriceCents / 100,
      yearlyPrice: tier.yearlyPriceCents / 100,
      trialDays: tier.trialDays,
      features: (tier.features as string[]) || [],
      stripePriceIdMonthly: tier.stripePriceIdMonthly || undefined,
      stripePriceIdYearly: tier.stripePriceIdYearly || undefined,
    }));
  } catch (error) {
    console.error('Error getting pricing info:', error);
    return [];
  }
}
