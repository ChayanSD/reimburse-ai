"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Check, Star, Gift, Users } from "lucide-react";

interface UserSubscription {
  tier: "free" | "pro" | "premium";
  status?: string;
}

interface Plan {
  name: string;
  tier: "free" | "pro" | "premium";
  price: string;
  period: string;
  subtext: string;
  features: string[];
  button: string;
  popular: boolean;
  disabled: boolean;
}

interface CheckoutResponse {
  url: string;
}

type BillingInterval = "month" | "year";

const fetchUserSubscription = async (): Promise<UserSubscription | null> => {
  const { data } = await axios.get<UserSubscription>("/api/user/subscription");
  return data;
};

const createCheckoutSession = async ({
  product,
  billing_cycle,
}: {
  product: string;
  billing_cycle: "monthly" | "yearly";
}): Promise<CheckoutResponse> => {
  const { data } = await axios.post<CheckoutResponse>("/api/stripe-checkout-link", {
    product,
    billing_cycle,
  });
  return data;
};

export default function PricingPage() {
  const [interval, setInterval] = useState<BillingInterval>("month");

  const { data: userSubscription } = useQuery({
    queryKey: ["userSubscription"],
    queryFn: fetchUserSubscription,
    retry: false,
  });

  const checkoutMutation = useMutation({
    mutationFn: createCheckoutSession,
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error) => {
      console.error("Checkout error:", error);
      alert("Failed to start checkout. Please try again.");
    },
  });

  const plans: Plan[] = [
    {
      name: "Free Trial",
      tier: "free",
      price: "$0",
      period: "",
      subtext: "7-day trial",
      features: [
        "7-day full access",
        "10 receipt uploads",
        "1 report export",
        "Basic OCR processing",
        "PDF export only",
      ],
      button: "Start Free Trial",
      popular: false,
      disabled: false,
    },
    {
      name: "Pro",
      tier: "pro",
      price: interval === "year" ? "$99.99" : "$9.99",
      period: interval === "year" ? "/year" : "/month",
      subtext: interval === "year" ? "2 months free" : "",
      features: [
        "Unlimited uploads & reports",
        "Custom branding",
        "CSV export",
        "Priority processing",
        "Advanced OCR",
        "Email support",
      ],
      button: "Upgrade to Pro",
      popular: true,
      disabled: userSubscription?.tier === "pro" || userSubscription?.tier === "premium",
    },
    {
      name: "Premium",
      tier: "premium",
      price: interval === "year" ? "$149.99" : "$14.99",
      period: interval === "year" ? "/year" : "/month",
      subtext: interval === "year" ? "3 months free" : "",
      features: [
        "Everything in Pro",
        "Email receipt ingestion",
        "Team collaboration",
        "Analytics dashboard",
        "Private cloud archive",
        "Priority support",
        "API access",
      ],
      button: "Upgrade to Premium",
      popular: false,
      disabled: userSubscription?.tier === "premium",
    },
  ];

  const handleCheckout = (plan: Plan) => {
    if (plan.tier === "free") {
      window.location.assign("/dashboard");
      return;
    }

    if (plan.disabled) {
      return;
    }

    checkoutMutation.mutate({
      product: plan.tier,
      billing_cycle: interval === "year" ? "yearly" : "monthly",
    });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>
      
      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-linear-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Start with a free trial, then choose the plan that fits your needs. 
            All plans include our AI-powered receipt processing.
          </p>
          
          {/* Early Adopter Banner */}
          <div className="inline-flex items-center gap-2 bg-linear-to-r from-yellow-500 to-orange-500 text-black px-6 py-3 rounded-full font-semibold mb-8">
            <Star className="w-5 h-5" />
            Early Adopters Get 25% Off Forever
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-1 border border-slate-700">
            <button
              onClick={() => setInterval("month")}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                interval === "month"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval("year")}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                interval === "year"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className={`relative bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border transition-all duration-300 hover:scale-105 ${
                plan.popular
                  ? "border-blue-500 shadow-2xl shadow-blue-500/20"
                  : "border-slate-700 hover:border-slate-600"
              } ${plan.disabled ? "opacity-60" : ""}`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-linear-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center mb-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-400 ml-1">{plan.period}</span>
                </div>
                {plan.subtext && (
                  <p className="text-sm text-green-400 font-medium">{plan.subtext}</p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Button
                onClick={() => handleCheckout(plan)}
                disabled={checkoutMutation.isPending || plan.disabled}
                className={`w-full py-3 text-lg font-semibold transition-all ${
                  plan.popular
                    ? "bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                    : "bg-slate-700 hover:bg-slate-600"
                } ${
                  plan.disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:shadow-lg hover:shadow-blue-500/25"
                }`}
              >
                {checkoutMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </div>
                ) : plan.disabled ? (
                  "Current Plan"
                ) : (
                  plan.button
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* Incentives Section */}
        <div className="mt-16 text-center">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-6">Special Offers</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-xl">
                <Gift className="w-8 h-8 text-yellow-400" />
                <div className="text-left">
                  <h4 className="font-semibold">Referral Bonus</h4>
                  <p className="text-sm text-gray-300">Invite 3 friends → Get 1 free month of Pro</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-xl">
                <Users className="w-8 h-8 text-blue-400" />
                <div className="text-left">
                  <h4 className="font-semibold">Team Collaboration</h4>
                  <p className="text-sm text-gray-300">Premium includes team features & analytics</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <h4 className="font-semibold mb-2">Can I change plans anytime?</h4>
              <p className="text-gray-300 text-sm">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <h4 className="font-semibold mb-2">What happens after my trial?</h4>
              <p className="text-gray-300 text-sm">
                After your 7-day trial, you&apos;ll be moved to the free tier with limited features. 
                Upgrade anytime to continue with full access.
              </p>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <h4 className="font-semibold mb-2">Is there a setup fee?</h4>
              <p className="text-gray-300 text-sm">
                No setup fees! Start with a free trial and only pay when you&apos;re ready to
                upgrade.
              </p>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <h4 className="font-semibold mb-2">Can I cancel anytime?</h4>
              <p className="text-gray-300 text-sm">
                Absolutely! Cancel anytime with no penalties. Your data remains accessible 
                even after cancellation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
