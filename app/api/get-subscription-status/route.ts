import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function POST(): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's subscription status from database
    const user = await prisma.authUser.findUnique({
      where: { id: session.id },
      select: {
        subscriptionStatus: true,
        subscriptionTier: true,
        subscriptionEndsAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Determine if subscription is active
    const isActive = user.subscriptionStatus === "active" && 
                     (!user.subscriptionEndsAt || user.subscriptionEndsAt > new Date());

    const response = {
      status: isActive ? "active" : "inactive",
      subscription_tier: user.subscriptionTier || "free",
      current_period_end: user.subscriptionEndsAt?.getTime(),
      stripe_customer_id: user.stripeCustomerId,
      stripe_subscription_id: user.stripeSubscriptionId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
