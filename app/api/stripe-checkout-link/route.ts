import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
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
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { product, billing_cycle = "monthly" } = body;

    if (!product) {
      return NextResponse.json(
        { error: "Product is required" },
        { status: 400 }
      );
    }

    // Get user details
    const user = await prisma.authUser.findUnique({
      where: { id: session.id },
      select: {
        email: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Initialize Stripe
    const stripe = getStripeInstance();

    const priceData = getPriceData(product as Plan, billing_cycle as BillingCycle);
    if (!priceData) {
      return NextResponse.json(
        { error: "Invalid product selected" },
        { status: 400 }
      );
    }

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: session.id.toString(),
        },
      });
      stripeCustomerId = customer.id;
      await prisma.authUser.update({
        where: { id: session.id },
        data: { stripeCustomerId },
      });
    }

    const successUrl = `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.APP_URL}/plans`;

    const checkoutSession = await stripe.checkout.sessions.create({
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
        user_id: session.id.toString(),
        plan: product,
        billing_cycle: billing_cycle,
      },
      allow_promotion_codes: true,
      billing_address_collection: "required",
    });

    // Log audit event
    await logAuditEvent(session.id, "checkout_created", {
      plan: product,
      billing_cycle,
      session_id: checkoutSession.id,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating checkout link:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
