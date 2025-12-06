import { getSession } from "@/lib/session";
import { getUserSubscriptionInfo } from "@/lib/subscriptionGuard";
import { NextResponse } from "next/server";

export async function GET() : Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || !session.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.id;
    const subscription = await getUserSubscriptionInfo(userId);

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      subscription: {
        tier: subscription.tier,
        status: subscription.status,
        trialEnd: subscription.trialEnd,
        subscriptionEnd: subscription.subscriptionEnd,
        earlyAdopter: subscription.earlyAdopter,
        lifetimeDiscount: subscription.lifetimeDiscount,
        features: subscription.features,
        usage: {
          receipts: subscription.usageReceipts,
          reports: subscription.usageReports,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/user/subscription error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
