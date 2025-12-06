import Stripe from "stripe";

export const getStripeInstance = () => {
  const isLive = process.env.STRIPE_MODE === "live";
  const secretKey = isLive
    ? process.env.STRIPE_SECRET_KEY_LIVE
    : process.env.STRIPE_SECRET_KEY_TEST;

  // Fallback to old format for backward compatibility
  if (!secretKey && process.env.STRIPE_SECRET_KEY) {
    return new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
    });
  }

  if (!secretKey) {
    throw new Error(
      `Stripe ${isLive ? "live" : "test"} secret key not configured`
    );
  }

  return new Stripe(secretKey, { apiVersion: "2025-11-17.clover" });
};