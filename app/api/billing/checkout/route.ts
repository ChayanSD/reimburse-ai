import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getStripeInstance } from "@/lib/stripe";

type Plan = "free" | "pro" | "premium";

type PriceData = {
  currency: string;
  product_data: { name: string };
  recurring: { interval: "month" | "year" };
  unit_amount: number;
};

type BillingCycle = "monthly" | "yearly";

type PricesType = {
  free: null;
  pro: Record<BillingCycle, PriceData>;
  premium: Record<BillingCycle, PriceData>;
};

// Initialize Stripe with environment-based key


const getPriceData = (
  product: Plan,
  billingCycle: BillingCycle = "monthly"
) => {
  const prices: PricesType = {
    free: null, // Free trial doesn't require payment
    pro: {
      monthly: {
        currency: "usd",
        product_data: { name: "ReimburseMe Pro Plan - Monthly" },
        recurring: { interval: "month" as const },
        unit_amount: 900, // $9.00
      },
      yearly: {
        currency: "usd",
        product_data: { name: "ReimburseMe Pro Plan - Yearly" },
        recurring: { interval: "year" as const },
        unit_amount: 9000, // $90.00 (2 months free)
      },
    },
    premium: {
      monthly: {
        currency: "usd",
        product_data: { name: "ReimburseMe Premium Plan - Monthly" },
        recurring: { interval: "month" as const },
        unit_amount: 1500, // $15.00
      },
      yearly: {
        currency: "usd",
        product_data: { name: "ReimburseMe Premium Plan - Yearly" },
        recurring: { interval: "year" as const },
        unit_amount: 15000, // $150.00 (2 months free)
      },
    },
  };

  if (!prices[product]) {
    return null;
  }

  return prices[product][billingCycle] || prices[product].monthly;
};

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
        eventData: JSON.parse(JSON.stringify(meta)),
      },
    });
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log("Starting checkout session creation");

    // Initialize Stripe with environment-based key
    const stripe = getStripeInstance();

    const session = await getSession();
    console.log("Auth session:", session ? "User found" : "No user");

    const { plan = "pro", billing_cycle = "monthly" } = await request.json();
    console.log("Request data:", { plan, billing_cycle });

    if (!session?.email || !session?.id) {
      console.log("Authentication failed - no session or user");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const email = session.email;
    const userId = session.id;

    const priceData = getPriceData(plan, billing_cycle);
    if (!priceData) {
      console.log("Invalid price data for plan:", plan);
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    console.log("Price data:", priceData);

    // Get current user's stripe_customer_id
    const user = await prisma.authUser.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    let stripeCustomerId = user?.stripeCustomerId;
    console.log("Existing Stripe customer ID:", stripeCustomerId || "None");

    if (!stripeCustomerId) {
      try {
        console.log("Creating new Stripe customer");
        // Create new customer in Stripe
        const customer = await stripe.customers.create({
          email,
          metadata: {
            user_id: userId.toString(),
          },
        });
        stripeCustomerId = customer.id;
        console.log("Created Stripe customer:", stripeCustomerId);

        // Update user with stripe_customer_id
        await prisma.authUser.update({
          where: { id: userId },
          data: { stripeCustomerId },
        });
        console.log("Database update result: Success");
      } catch (stripeError) {
        console.error("Stripe customer creation failed:", stripeError);
        return NextResponse.json(
          { error: "Failed to set up payment processing. Please try again." },
          { status: 500 }
        );
      }
    }

    const successUrl = `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.APP_URL}/plans`;

    console.log("Creating checkout session with URLs:", {
      successUrl,
      cancelUrl,
    });

    let checkoutSession;
    try {
      checkoutSession = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: priceData,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: userId.toString(),
          plan: plan,
          billing_cycle: billing_cycle,
        },
        allow_promotion_codes: true,
        billing_address_collection: "required",
      });
    } catch (stripeError) {
      console.error("Stripe checkout session creation failed:", stripeError);
      return NextResponse.json(
        { error: "Failed to create payment session. Please try again." },
        { status: 500 }
      );
    }

    console.log("Checkout session created successfully:", checkoutSession.id);

    // Log audit event
    await logAuditEvent(userId, "checkout_created", {
      plan,
      billing_cycle,
      session_id: checkoutSession.id,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    if (error instanceof Stripe.errors.StripeError) {
      console.error("Error details:", {
        message: error.message,
        type: error.type,
        code: error.code,
        stack: error.stack,
      });
    } else if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
