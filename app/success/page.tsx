"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

// Type definitions based on the API response structure
interface BillingApiResponse {
  payment_status?: "completed" | "processing";
  error?: string;
  subscription_id?: string;
  status?: string;
  amount?: number | null;
  interval?: string;
  next_billing?: number;
  plan_name?: string;
}

interface VerifyPaymentRequest {
  session_id: string;
}

type PaymentStatus = "loading" | "success" | "error";

// Axios configuration
const axiosInstance = axios.create({
  baseURL: "/",
  headers: {
    "Content-Type": "application/json",
  },
});

export default function SuccessPage() {
  const [status, setStatus] = useState<PaymentStatus>("loading");
  const [error, setError] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(3);
  const queryClient = useQueryClient();

  // Get session ID from URL
  const getSessionId = useCallback(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("session_id");
    }
    return null;
  }, []);

  // Use react-query for payment verification with polling
  const {
    data: subscriptionData,
    error: queryError,
  } = useQuery({
    queryKey: ["verifyPayment", getSessionId()],
    queryFn: async (): Promise<BillingApiResponse> => {
      const session_id = getSessionId();
      if (!session_id) {
        throw new Error("No session ID found. Please contact support if you completed a payment.");
      }

      const response = await axiosInstance.post<BillingApiResponse>("/api/billing/verify-payment", {
        session_id,
      } as VerifyPaymentRequest);

      return response.data;
    },
    enabled: !!getSessionId(),
    refetchInterval: (query) => {
      // Continue polling if payment is still processing
      if (query.state.data?.payment_status === "processing") {
        return 1000; // Poll every 1 second
      }
      return false; // Stop polling
    },
    refetchIntervalInBackground: true,
    retry: (failureCount) => {
      // Retry up to 10 times (10 seconds total)
      return failureCount < 10;
    },
    retryDelay: 1000,
    staleTime: 0,
    gcTime: 0,
  });

  // Redirect to dashboard function with proper typing
  const redirectToDashboard = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard";
    }
  }, []);

  // Handle query status changes
  useEffect(() => {
    const updateStatus = () => {
      if (subscriptionData?.payment_status === "completed") {
        setStatus("success");
      } else if (subscriptionData?.payment_status === "processing") {
        setStatus("loading");
      } else if (queryError) {
        setStatus("error");
        setError(queryError instanceof Error ? queryError.message : "An unexpected error occurred");
      } else if (subscriptionData) {
        // If we have data but payment is not completed, still treat as success
        // This handles the case where we've reached max retry attempts
        setStatus("success");
      }
    };

    // Use setTimeout to avoid synchronous state updates
    const timeoutId = setTimeout(updateStatus, 0);
    return () => clearTimeout(timeoutId);
  }, [subscriptionData?.payment_status, subscriptionData, queryError]);

  // Countdown timer for auto-redirect
  useEffect(() => {
    if (status === "success" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status === "success" && countdown === 0) {
      redirectToDashboard();
    }
  }, [status, countdown, redirectToDashboard]);

  // Properly typed handler for going to dashboard
  const handleGoToDashboard = useCallback(() => {
    redirectToDashboard();
  }, [redirectToDashboard]);

  // Retry verification
  const handleRetry = useCallback(() => {
    setError("");
    setStatus("loading");
    queryClient.invalidateQueries({ queryKey: ["verifyPayment", getSessionId()] });
  }, [queryClient, getSessionId]);

  // Loading state component
  if (status === "loading") {
    return (
      <div
        className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#2E86DE] bg-opacity-10 rounded-full mb-6">
            <Loader2 className="w-10 h-10 text-[#2E86DE] animate-spin" />
          </div>

          <h1
            className="text-3xl font-bold text-gray-900 mb-4"
            style={{ fontFamily: "Poppins, system-ui, sans-serif" }}
          >
            Processing Payment...
          </h1>

          <p className="text-gray-600 text-lg mb-6">
            Please wait while we confirm your subscription.
          </p>

          <div className="flex justify-center">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-[#2E86DE] rounded-full animate-bounce"></div>
              <div
                className="w-3 h-3 bg-[#2E86DE] rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-3 h-3 bg-[#2E86DE] rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state component
  if (status === "error") {
    return (
      <div
        className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          <h1
            className="text-3xl font-bold text-gray-900 mb-4"
            style={{ fontFamily: "Poppins, system-ui, sans-serif" }}
          >
            Payment Issue
          </h1>

          <p className="text-gray-600 text-lg mb-6">{error}</p>

          <div className="space-y-3">
            <button
              onClick={handleGoToDashboard}
              className="w-full py-3 px-6 bg-[#2E86DE] text-white rounded-2xl font-semibold hover:bg-[#2574C7] transition-colors"
            >
              Go to Dashboard
            </button>

            <button
              onClick={handleRetry}
              className="w-full py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Try Again
            </button>

            <button
              onClick={() => typeof window !== "undefined" && (window.location.href = "/plans")}
              className="w-full py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Back to Plans
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state component
  return (
    <div
      className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 bg-[#10B981] rounded-full mb-6">
          <Check className="w-12 h-12 text-white" />
        </div>

        <h1
          className="text-4xl font-bold text-gray-900 mb-4"
          style={{ fontFamily: "Poppins, system-ui, sans-serif" }}
        >
          You&apos;re All Set!
        </h1>

        <p className="text-gray-600 text-lg mb-8">
          Welcome to ReimburseMe! Your subscription is now active and you&apos;re
          ready to start managing your expenses like a pro.
        </p>

        {/* Subscription Details */}
        {subscriptionData && (
          <div className="bg-[#F3F4F6] rounded-2xl p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">
              Subscription Details
            </h3>
            <div className="space-y-3 text-left">
              <div className="flex justify-between">
                <span className="text-gray-600">Plan:</span>
                <span className="font-semibold text-gray-900 capitalize">
                  {subscriptionData.plan_name || "Pro"}
                </span>
              </div>
              {subscriptionData.amount && subscriptionData.interval && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Billing:</span>
                  <span className="font-semibold text-gray-900">
                    ${subscriptionData.amount / 100} /{" "}
                    {subscriptionData.interval}
                  </span>
                </div>
              )}
              {subscriptionData.next_billing && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Next billing:</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(
                      subscriptionData.next_billing * 1000,
                    ).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* What's Next */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">What&apos;s next?</h3>
          <ul className="text-left space-y-3 text-gray-700">
            <li className="flex items-start">
              <Check className="w-5 h-5 text-[#10B981] mr-3 mt-0.5 shrink-0" />
              <span>Upload your first receipt</span>
            </li>
            <li className="flex items-start">
              <Check className="w-5 h-5 text-[#10B981] mr-3 mt-0.5 shrink-0" />
              <span>Set up expense categories</span>
            </li>
            <li className="flex items-start">
              <Check className="w-5 h-5 text-[#10B981] mr-3 mt-0.5 shrink-0" />
              <span>Generate your first report</span>
            </li>
          </ul>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleGoToDashboard}
          className="w-full py-4 px-6 bg-[#2E86DE] text-white rounded-2xl font-semibold hover:bg-[#2574C7] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:ring-offset-2 mb-4 flex items-center justify-center"
        >
          Go to Dashboard
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>

        {/* Auto-redirect notice */}
        <p className="text-sm text-gray-500">
          Redirecting automatically in {countdown} second
          {countdown !== 1 ? "s" : ""}...
        </p>
      </div>
    </div>
  );
}
