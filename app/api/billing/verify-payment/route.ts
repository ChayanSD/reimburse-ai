import { getSession } from "@/lib/session";
import { getStripeInstance } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from '@/app/generated/prisma/client';


async function logAuditEvent(
  userId: number,
  event: string,
  meta: Record<string, unknown> = {}
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        eventType: event,
        eventData: meta as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const stripe = getStripeInstance();

  try {
    const session = await getSession();
    const { session_id } = await request.json();

    if (!session?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    if (!session_id) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 },
      );
    }

    const userId = session.id;

    try {
      // Retrieve the checkout session from Stripe
      const checkoutSession =
        await stripe.checkout.sessions.retrieve(session_id);

      if (!checkoutSession) {
        return NextResponse.json({ error: "Invalid session ID" }, { status: 404 });
      }

      // Verify the session belongs to the current user
      if (checkoutSession.metadata?.user_id !== userId.toString()) {
        return NextResponse.json(
          { error: "Session does not belong to current user" },
          { status: 403 },
        );
      }

      if (checkoutSession.payment_status !== "paid") {
        return NextResponse.json({
          status: "processing",
          message: "Payment is still being processed",
        });
      }

      // Get subscription details
      interface SubscriptionData {
        subscription_id?: string;
        status?: string;
        amount?: number | null;
        interval?: string;
        next_billing?: number;
        plan_name?: string;
      }
      
      let subscriptionData: SubscriptionData = {};
      let planTier = "free";

      if (checkoutSession.subscription) {
        try {
          // Extract the subscription ID string from the checkout session
          const subscriptionId = typeof checkoutSession.subscription === 'string' 
            ? checkoutSession.subscription 
            : checkoutSession.subscription.id;
            
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          if (subscription && subscription.status === "active") {
            const priceAmount = subscription.items.data[0]?.price?.unit_amount ?? null;
            const interval =
              subscription.items.data[0]?.price?.recurring?.interval;

            // Determine plan tier based on price
            if (priceAmount === 900 || priceAmount === 9000) {
              planTier = "pro";
            } else if (priceAmount === 1500 || priceAmount === 15000) {
              planTier = "premium";
            }

            // Handle the subscription object properly
            const sub = typeof subscription === 'object' && 'id' in subscription ? subscription : null;
            const currentPeriodEnd = sub && 'current_period_end' in sub ? (sub as { current_period_end: number }).current_period_end : null;

            subscriptionData = {
              subscription_id: sub?.id || '',
              status: sub?.status || '',
              amount: priceAmount,
              interval: interval,
              next_billing: currentPeriodEnd ? Number(currentPeriodEnd) : undefined,
              plan_name: checkoutSession.metadata?.plan || planTier,
            };

            // Update user's subscription in database using Prisma
            await prisma.authUser.update({
              where: { id: userId },
              data: {
                subscriptionTier: planTier,
                subscriptionStatus: subscription.status,
              },
            });

            // Log successful activation
            await logAuditEvent(userId, "subscription_activated", {
              plan: planTier,
              subscription_id: subscription.id,
              session_id: session_id,
            });
          }
        } catch (subError) {
          console.error("Error retrieving subscription:", subError);
          // Continue even if subscription retrieval fails
        }
      }

      return NextResponse.json({
        status: "completed",
        payment_status: checkoutSession.payment_status,
        ...subscriptionData,
      });
    } catch (stripeError) {
      console.error("Stripe API error:", stripeError);

      if (stripeError && typeof stripeError === 'object' && 'type' in stripeError && 
          stripeError.type === "StripeInvalidRequestError") {
        return NextResponse.json({ error: "Invalid session ID" }, { status: 404 });
      }

      return NextResponse.json(
        { error: "Failed to verify payment with Stripe" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "An error occurred while verifying payment" },
      { status: 500 },
    );
  }
};
