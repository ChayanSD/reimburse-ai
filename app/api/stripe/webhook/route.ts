import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { internalServerError } from "@/lib/error";
import { getStripeInstance } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

// Initialize Stripe with environment-based key

// Get webhook secret based on environment
const getWebhookSecret = () => {
  const isLive = process.env.STRIPE_MODE === 'live';
  const webhookSecret = isLive ? process.env.STRIPE_WEBHOOK_SECRET_LIVE : process.env.STRIPE_WEBHOOK_SECRET_TEST;
  
  if (!webhookSecret) {
    throw new Error(`Stripe ${isLive ? 'live' : 'test'} webhook secret not configured`);
  }
  
  return webhookSecret;
};

//export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    console.error("Missing Stripe signature");
    return new NextResponse("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeInstance();
    const webhookSecret = getWebhookSecret();
    
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new NextResponse(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`, { status: 400 });
  }

  console.log("Received Stripe webhook event:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.trial_will_end":
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return internalServerError("Webhook processing failed");
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log("Processing checkout session completed:", session.id);
  
  const userId = parseInt(session.metadata?.user_id || '0');
  const plan = session.metadata?.plan;
  const billingCycle = session.metadata?.billing_cycle;
  const referralCode = session.metadata?.referral_code;

  if (!userId || !plan) {
    console.error("Missing required metadata in checkout session");
    return;
  }

  try {
    // Update user subscription
    const subscriptionEndsAt = new Date();
    if (billingCycle === 'month') {
      subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1);
    } else if (billingCycle === 'year') {
      subscriptionEndsAt.setFullYear(subscriptionEndsAt.getFullYear() + 1);
    }

    await prisma.authUser.update({
      where: { id: userId },
      data: {
        subscriptionTier: plan,
        subscriptionStatus: 'active',
        stripeCustomerId: session.customer as string,
        subscriptionEndsAt: subscriptionEndsAt,
      },
    });

    // Log subscription event
    await prisma.subscriptionEvent.create({
      data: {
        userId: userId,
        eventType: 'subscription_created',
        newTier: plan,
        newStatus: 'active',
        stripeEventId: session.id,
        metadata: {
          billingCycle,
          referralCode,
          sessionId: session.id,
          customerId: session.customer as string,
        },
      },
    });

    // Handle referral bonus if applicable
    if (referralCode) {
      await handleReferralBonus(userId, referralCode);
    }

    console.log(`User ${userId} successfully subscribed to ${plan} plan`);
  } catch (error) {
    console.error("Error processing checkout session completed:", error);
    throw error;
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log("Processing subscription created:", subscription.id);
  
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;
  const currentPeriodEnd = new Date((Number((subscription as unknown as { current_period_end: number }).current_period_end)) * 1000);

  try {
    // Find user by Stripe customer ID
    const user = await prisma.authUser.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });

    if (!user) {
      console.error("User not found for customer ID:", customerId);
      return;
    }

    const userId = user.id;

    // Determine tier from subscription items
    const tier = determineTierFromSubscription(subscription);
    
    // Update user subscription
    await prisma.authUser.update({
      where: { id: userId },
      data: {
        subscriptionTier: tier,
        subscriptionStatus: status,
        stripeSubscriptionId: subscriptionId,
        subscriptionEndsAt: currentPeriodEnd,
      },
    });

    // Log subscription event
    await prisma.subscriptionEvent.create({
      data: {
        userId: userId,
        eventType: 'subscription_created',
        newTier: tier,
        newStatus: status,
        stripeEventId: subscription.id,
        metadata: {
          subscriptionId,
          customerId,
          currentPeriodEnd: currentPeriodEnd.toISOString(),
        },
      },
    });

    console.log(`User ${userId} subscription created: ${tier} - ${status}`);
  } catch (error) {
    console.error("Error processing subscription created:", error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("Processing subscription updated:", subscription.id);
  
  const subscriptionId = subscription.id;
  const status = subscription.status;
  const currentPeriodEnd = new Date((Number((subscription as unknown as { current_period_end: number }).current_period_end)) * 1000);

  try {
    // Find user by subscription ID
    const user = await prisma.authUser.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
      select: { id: true, subscriptionTier: true },
    });

    if (!user) {
      console.error("User not found for subscription ID:", subscriptionId);
      return;
    }

    const userId = user.id;
    const oldTier = user.subscriptionTier;
    const tier = determineTierFromSubscription(subscription);
    
    // Update user subscription
    await prisma.authUser.update({
      where: { id: userId },
      data: {
        subscriptionTier: tier,
        subscriptionStatus: status,
        subscriptionEndsAt: currentPeriodEnd,
      },
    });

    // Log subscription event
    await prisma.subscriptionEvent.create({
      data: {
        userId: userId,
        eventType: 'subscription_updated',
        oldTier: oldTier,
        newTier: tier,
        oldStatus: 'active',
        newStatus: status,
        stripeEventId: subscription.id,
        metadata: {
          subscriptionId,
          currentPeriodEnd: currentPeriodEnd.toISOString(),
        },
      },
    });

    console.log(`User ${userId} subscription updated: ${oldTier} -> ${tier} - ${status}`);
  } catch (error) {
    console.error("Error processing subscription updated:", error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("Processing subscription deleted:", subscription.id);
  
  const subscriptionId = subscription.id;

  try {
    // Find user by subscription ID
    const user = await prisma.authUser.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
      select: { id: true },
    });

    if (!user) {
      console.error("User not found for subscription ID:", subscriptionId);
      return;
    }

    const userId = user.id;
    
    // Downgrade user to free tier
    await prisma.authUser.update({
      where: { id: userId },
      data: {
        subscriptionTier: 'free',
        subscriptionStatus: 'canceled',
        subscriptionEndsAt: null,
        stripeSubscriptionId: null,
      },
    });

    // Log subscription event
    await prisma.subscriptionEvent.create({
      data: {
        userId: userId,
        eventType: 'subscription_canceled',
        newTier: 'free',
        newStatus: 'canceled',
        stripeEventId: subscription.id,
        metadata: {
          subscriptionId,
          canceledAt: new Date().toISOString(),
        },
      },
    });

    console.log(`User ${userId} subscription canceled and downgraded to free`);
  } catch (error) {
    console.error("Error processing subscription deleted:", error);
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log("Processing invoice payment succeeded:", invoice.id);
  
  const customerId = invoice.customer as string;
  const subscriptionId = ''; // subscription property not available in Stripe Invoice type

  try {
    // Find user by customer ID
    const user = await prisma.authUser.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });

    if (!user) {
      console.error("User not found for customer ID:", customerId);
      return;
    }

    const userId = user.id;
    
    // Update subscription status to active
    await prisma.authUser.update({
      where: { id: userId },
      data: { subscriptionStatus: 'active' },
    });

    // Log payment event
    await prisma.subscriptionEvent.create({
      data: {
        userId: userId,
        eventType: 'payment_succeeded',
        stripeEventId: invoice.id,
        metadata: {
          invoiceId: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          subscriptionId,
        },
      },
    });

    console.log(`User ${userId} payment succeeded for invoice ${invoice.id}`);
  } catch (error) {
    console.error("Error processing invoice payment succeeded:", error);
    throw error;
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log("Processing invoice payment failed:", invoice.id);
  
  const customerId = invoice.customer as string;

  try {
    // Find user by customer ID
    const user = await prisma.authUser.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });

    if (!user) {
      console.error("User not found for customer ID:", customerId);
      return;
    }

    const userId = user.id;
    
    // Update subscription status to past_due
    await prisma.authUser.update({
      where: { id: userId },
      data: { subscriptionStatus: 'past_due' },
    });

    // Log payment event
    await prisma.subscriptionEvent.create({
      data: {
        userId: userId,
        eventType: 'payment_failed',
        stripeEventId: invoice.id,
        metadata: {
          invoiceId: invoice.id,
          amount: invoice.amount_due,
          currency: invoice.currency,
          nextPaymentAttempt: invoice.next_payment_attempt,
        },
      },
    });

    console.log(`User ${userId} payment failed for invoice ${invoice.id}`);
  } catch (error) {
    console.error("Error processing invoice payment failed:", error);
    throw error;
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  console.log("Processing trial will end:", subscription.id);
  
  const customerId = subscription.customer as string;
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : new Date();

  try {
    // Find user by customer ID
    const user = await prisma.authUser.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });

    if (!user) {
      console.error("User not found for customer ID:", customerId);
      return;
    }

    const userId = user.id;
    
    // Log trial ending event
    await prisma.subscriptionEvent.create({
      data: {
        userId: userId,
        eventType: 'trial_ending',
        stripeEventId: subscription.id,
        metadata: {
          trialEnd: trialEnd.toISOString(),
          subscriptionId: subscription.id,
        },
      },
    });

    console.log(`User ${userId} trial ending on ${trialEnd.toISOString()}`);
  } catch (error) {
    console.error("Error processing trial will end:", error);
    throw error;
  }
}

function determineTierFromSubscription(subscription: Stripe.Subscription): string {
  // Determine tier based on subscription items
  const items = subscription.items.data;
  
  for (const item of items) {
    const priceId = item.price.id;
    
    // Check against configured price IDs
    if (priceId === process.env.PRICE_PRO_MONTHLY || priceId === process.env.PRICE_PRO_YEARLY) {
      return 'pro';
    }
    if (priceId === process.env.PRICE_PREMIUM_MONTHLY || priceId === process.env.PRICE_PREMIUM_YEARLY) {
      return 'premium';
    }
  }
  
  // Fallback to pro if we can't determine
  return 'pro';
}

async function handleReferralBonus(userId: number, referralCode: string) {
  try {
    // Find referrer by referral code
    const referrer = await prisma.authUser.findFirst({
      where: { referralCode: referralCode },
      select: { id: true },
    });

    if (!referrer) {
      console.log("Referrer not found for code:", referralCode);
      return;
    }

    const referrerId = referrer.id;

    // Check if this referral is already processed
    const existingReferral = await prisma.referralTracking.findUnique({
      where: { referredId: userId },
    });

    if (existingReferral) {
      console.log("Referral already processed for user:", userId);
      return;
    }

    // Create referral tracking record
    await prisma.referralTracking.create({
      data: {
        referrerId: referrerId,
        referredId: userId,
        referralCode: referralCode,
        status: 'completed',
        rewardType: 'free_month',
        rewardValue: 9.99,
        completedAt: new Date(),
      },
    });

    // Check if referrer qualifies for free month (3 referrals)
    const referralCount = await prisma.referralTracking.count({
      where: { 
        referrerId: referrerId, 
        status: 'completed' 
      },
    });

    if (referralCount >= 3) {
      // Grant free month to referrer
      const referrer = await prisma.authUser.findUnique({
        where: { id: referrerId },
        select: { subscriptionEndsAt: true },
      });
      
      if (referrer?.subscriptionEndsAt) {
        const newEndDate = new Date(referrer.subscriptionEndsAt);
        newEndDate.setMonth(newEndDate.getMonth() + 1);
        
        await prisma.authUser.update({
          where: { id: referrerId },
          data: {
            subscriptionEndsAt: newEndDate,
          },
        });
      }

      console.log(`Referrer ${referrerId} earned free month for 3 referrals`);
    }

    console.log(`Referral bonus processed: ${referrerId} -> ${userId}`);
  } catch (error) {
    console.error("Error processing referral bonus:", error);
  }
}