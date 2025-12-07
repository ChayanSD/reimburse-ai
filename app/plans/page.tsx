"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Check, Crown, Zap, Star } from "lucide-react";
import Link from "next/link";
import useUser from "@/utils/useUser";

interface PlanFeature {
  name: string;
  subtitle: string;
  price: {
    monthly: number;
    yearly: number;
  };
  icon: React.ReactNode;
  color: string;
  buttonColor: string;
  popular?: boolean;
  features: string[];
  limitations?: string[];
}

interface AxiosError {
  response?: {
    status?: number;
    data?: {
      error?: string;
    };
  };
}

type PlanKey = "free" | "pro" | "premium";
type BillingCycle = "monthly" | "yearly";

export default function PlansPage() {
  const router = useRouter();
  const { data: user, loading: userLoading } = useUser();
  // const [selectedPlan, setSelectedPlan] = useState<PlanKey>("pro");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [error, setError] = useState("");

  // Create checkout mutation using axios and react query
  const checkoutMutation = useMutation({
    mutationFn: async ({ plan, billingCycle: cycle }: { plan: PlanKey; billingCycle: BillingCycle }) => {
      const response = await axios.post("/api/billing/checkout", {
        plan,
        billing_cycle: cycle,
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      window.location.href = data.url;
    },
    onError: (error: AxiosError | Error | unknown) => {
      console.error("Checkout error:", error);
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 401) {
        router.push("/account/signin");
        return;
      }
      setError(axiosError.response?.data?.error || "Failed to create checkout session");
    },
  });

  const plans: Record<PlanKey, PlanFeature> = {
    free: {
      name: "Free Trial",
      subtitle: "14 days",
      price: { monthly: 0, yearly: 0 },
      icon: <Star className="w-8 h-8 text-[#10B981]" />,
      color: "border-[#10B981]",
      buttonColor: "bg-[#10B981] hover:bg-green-600",
      features: [
        "1 monthly expense report",
        "Manual receipt uploads",
        "Basic expense categories",
        "Email support",
        "14-day free trial",
      ],
      limitations: ["Limited to 50 receipts", "No automated features"],
    },
    pro: {
      name: "Pro",
      subtitle: "Most Popular",
      price: { monthly: 9, yearly: 90 }, // 2 months free
      icon: <Zap className="w-8 h-8 text-[#2E86DE]" />,
      color: "border-[#2E86DE] ring-2 ring-[#2E86DE] ring-opacity-20",
      buttonColor: "bg-[#2E86DE] hover:bg-[#2574C7]",
      popular: true,
      features: [
        "Unlimited expense reports",
        "Automated monthly reports",
        "Custom report templates",
        "Advanced categorization",
        "Priority email support",
        "Export to CSV/PDF",
        "Receipt OCR scanning",
      ],
    },
    premium: {
      name: "Premium",
      subtitle: "Everything",
      price: { monthly: 15, yearly: 150 }, // 2 months free
      icon: <Crown className="w-8 h-8 text-[#FFD700]" />,
      color: "border-[#FFD700]",
      buttonColor: "bg-[#FFD700] hover:bg-yellow-500 text-black",
      features: [
        "Everything in Pro",
        "Gmail auto-import receipts",
        "Unlimited exports",
        "Real-time expense tracking",
        "Team collaboration",
        "API access",
        "White-label reports",
        "Phone support",
      ],
    },
  };

  const handleSelectPlan = (planKey: PlanKey) => {
    if (planKey === "free") {
      // Handle free trial - just redirect to dashboard
      router.push("/dashboard");
      return;
    }

    // Handle paid plans - create Stripe checkout using axios + react query
    setError("");
    checkoutMutation.mutate({ plan: planKey, billingCycle });
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2E86DE] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Please sign in
          </h1>
          <Link
            href="/account/signin"
            className="bg-[#2E86DE] text-white px-6 py-3 rounded-2xl font-semibold hover:bg-[#2574C7] transition-colors inline-block"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const isProcessing = checkoutMutation.isPending;

  return (
    <>
      <div
        className="min-h-screen bg-[#F3F4F6] py-12 px-4"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1
              className="text-4xl font-bold text-gray-900 mb-4"
              style={{ fontFamily: "Poppins, system-ui, sans-serif" }}
            >
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Start managing your expenses like a pro
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center bg-white rounded-2xl p-1 shadow-sm">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-6 py-2 rounded-xl font-semibold transition-colors ${
                  billingCycle === "monthly"
                    ? "bg-[#2E86DE] text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-6 py-2 rounded-xl font-semibold transition-colors relative ${
                  billingCycle === "yearly"
                    ? "bg-[#2E86DE] text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Yearly
                <span className="absolute -top-1 -right-1 bg-[#10B981] text-white text-xs px-2 py-1 rounded-full">
                  2 months free
                </span>
              </button>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {Object.entries(plans).map(([key, plan]) => (
              <div
                key={key}
                className={`bg-white rounded-3xl p-8 shadow-lg relative transition-transform hover:scale-105 border-2 ${
                  plan.popular ? plan.color : "border-gray-200"
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-[#2E86DE] text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-8">
                  <div className="mb-4">{plan.icon}</div>
                  <h3
                    className="text-2xl font-bold text-gray-900 mb-2"
                    style={{ fontFamily: "Poppins, system-ui, sans-serif" }}
                  >
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 text-sm">{plan.subtitle}</p>

                  <div className="mt-6">
                    {key === "free" ? (
                      <div>
                        <span className="text-4xl font-bold text-gray-900">
                          Free
                        </span>
                        <span className="text-gray-600 ml-2">14 days</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-4xl font-bold text-gray-900">
                          ${plan.price[billingCycle]}
                        </span>
                        <span className="text-gray-600 ml-1">
                          /{billingCycle === "yearly" ? "year" : "month"}
                        </span>
                        {billingCycle === "yearly" && (
                          <div className="text-sm text-[#10B981] font-semibold mt-1">
                            Save ${plan.price.monthly * 12 - plan.price.yearly}{" "}
                            per year
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Features List */}
                <div className="mb-8">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="w-5 h-5 text-[#10B981] mr-3 mt-0.5 shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.limitations && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-500 mb-2">Limitations:</p>
                      <ul className="space-y-2">
                        {plan.limitations.map((limitation, index) => (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2 shrink-0"></span>
                            <span className="text-sm text-gray-600">
                              {limitation}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(key as PlanKey)}
                  disabled={isProcessing}
                  className={`w-full py-3 px-6 rounded-2xl font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    plan.buttonColor
                  } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isProcessing ? "Processing..." : `Continue with ${plan.name}`}
                </button>
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="max-w-md mx-auto mb-8">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-center">
                {error}
              </div>
            </div>
          )}

          {/* FAQ/Features Section */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl p-8 shadow-lg">
              <h3
                className="text-2xl font-bold text-gray-900 mb-6 text-center"
                style={{ fontFamily: "Poppins, system-ui, sans-serif" }}
              >
                Why ReimburseMe?
              </h3>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-[#2E86DE] bg-opacity-10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-6 h-6 text-[#2E86DE]" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Lightning Fast
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Upload receipts and get organized reports in seconds
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-[#10B981] bg-opacity-10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-[#10B981]" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Accurate OCR
                  </h4>
                  <p className="text-gray-600 text-sm">
                    AI-powered receipt scanning with 99% accuracy
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-[#FFD700] bg-opacity-10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Crown className="w-6 h-6 text-[#FFD700]" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Enterprise Ready
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Built for teams and businesses of all sizes
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-12">
            <p className="text-gray-600 text-sm">
              Need help choosing?{" "}
              <Link
                href="mailto:support@reimburseme.com"
                className="text-[#2E86DE] hover:underline"
              >
                Contact our team
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
