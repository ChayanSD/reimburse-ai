"use client";

import { useCallback, useEffect } from "react";
import { create } from "zustand";

// Type definitions
interface SubscriptionData {
  success: boolean;
  subscription: {
    tier: string;
    status: string;
    trialEnd?: number;
    subscriptionEnd?: number;
    earlyAdopter: boolean;
    lifetimeDiscount: number;
    features: string[];
    usage: {
      receipts: number;
      reports: number;
    };
  };
}

interface SubscriptionStore {
  status: boolean | null;
  subscription_tier: string;
  loading: boolean;
  error: string | null;
  setStatus: (status: boolean | null) => void;
  setTier: (tier: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  checkSubscription: () => Promise<void>;
  refetchSubscription: () => Promise<void>;
}

const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  status: null,
  subscription_tier: "free",
  loading: true,
  error: null,
  
  setStatus: (status: boolean | null) => set({ status }),
  setTier: (tier: string) => set({ subscription_tier: tier }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
  
  checkSubscription: async () => {
    const currentState = get();
    if (currentState.loading === false && currentState.status !== null) {
      return; // Don't re-fetch if we already have data
    }

    try {
      set({ error: null });
      const response = await fetch("/api/user/subscription", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to check subscription status");
      }

      const data: SubscriptionData = await response.json();
      
      if (!data.success || !data.subscription) {
        throw new Error("Invalid subscription data received");
      }
      
      const isActive = data.subscription.status === "active" || data.subscription.status === "trial";

      set({
        status: isActive,
        subscription_tier: data.subscription.tier || "free",
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error checking subscription:", error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : "An unknown error occurred",
        status: false,
        subscription_tier: "free",
      });
    }
  },
  
  refetchSubscription: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/user/subscription", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to check subscription status");
      }

      const data: SubscriptionData = await response.json();
      
      if (!data.success || !data.subscription) {
        throw new Error("Invalid subscription data received");
      }
      
      const isActive = data.subscription.status === "active" || data.subscription.status === "trial";

      set({
        status: isActive,
        subscription_tier: data.subscription.tier || "free",
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error refetching subscription:", error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : "An unknown error occurred",
        status: false,
        subscription_tier: "free",
      });
    }
  },
}));

interface CheckoutResponse {
  url: string;
}

interface CheckoutError {
  error: string;
}

export function useSubscription() {
  const {
    status,
    subscription_tier,
    loading,
    error,
    checkSubscription,
    refetchSubscription,
  } = useSubscriptionStore();

  const initiateSubscription = useCallback(
    async (product: string = "pro") => {
      try {
        const response = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            priceId: product, // Using priceId to match Stripe terminology
            mode: "subscription",
          }),
        });

        if (!response.ok) {
          const errorData: CheckoutError = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));

          if (response.status === 401) {
            throw new Error("Please sign in to upgrade your plan");
          } else if (response.status === 403) {
            throw new Error(
              errorData.error ||
                "Please verify your email before selecting a plan",
            );
          } else {
            throw new Error(errorData.error || "Failed to get checkout link");
          }
        }

        const { url }: CheckoutResponse = await response.json();
        if (url) {
          // Open Stripe checkout in a popup window
          const popup: Window | null = window.open(
            url,
            "_blank",
            "popup,width=800,height=600",
          );

          if (popup) {
            // Monitor popup for completion
            const checkClosed = setInterval(() => {
              try {
                if (
                  popup.closed ||
                  popup.location.href.includes(window.location.origin)
                ) {
                  clearInterval(checkClosed);
                  popup.close();
                  // Refetch subscription status after checkout
                  refetchSubscription();
                }
              } catch (e) {
                console.error("Stripe checkout error:", e);
                // Cross-origin error when popup navigates to Stripe
                // This is expected and normal
              }
            }, 1000);

            // Also listen for successful payment via URL params
            const checkForSuccess = setInterval(() => {
              try {
                if (popup.location.href.includes("upgrade=success")) {
                  clearInterval(checkForSuccess);
                  clearInterval(checkClosed);
                  popup.close();
                  refetchSubscription();
                }
              } catch (e) {
                // Cross-origin error - expected
                console.error("Stripe checkout error:", e);
              }
            }, 1000);
          }
        } else {
          throw new Error("No checkout URL received");
        }
      } catch (error) {
        console.error("Error:", error);
        throw error; // Re-throw to maintain the original error message
      }
    },
    [refetchSubscription],
  );

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Check for successful payment on page load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("upgrade") === "success") {
        // Clear the URL params and refetch subscription
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
        refetchSubscription();
      }
    }
  }, [refetchSubscription]);

  return {
    isSubscribed: status,
    subscriptionTier: subscription_tier,
    data: status,
    loading,
    error,
    initiateSubscription,
    refetchSubscription,
  };
}

export default useSubscription;
