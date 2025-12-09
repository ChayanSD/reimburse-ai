"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useUser from "@/utils/useUser";
import { SessionUser } from "@/lib/session";
import {
  User,
  Crown,
  Mail,
  Calendar,
  Receipt,
  FileText,
  Check,
  Star,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// Types
interface SubscriptionUsage {
  receipts: number;
  reports: number;
}

interface SubscriptionData {
  tier: 'free' | 'pro' | 'premium';
  status: 'trial' | 'active' | 'canceled' | 'past_due' | 'inactive';
  trialEnd?: string;
  earlyAdopter: boolean;
  lifetimeDiscount: number;
  usage: SubscriptionUsage;
  features: string[];
}

// React Query Hooks
const useSubscription = () => {
  return useQuery<SubscriptionData>({
    queryKey: ['subscription-details'],
    queryFn: async () => {
      const response = await axios.get('/api/user/subscription');
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      return response.data.subscription;
    },
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Helper function to get user's display name
const getUserDisplayName = (user: SessionUser | null): string => {
  if (!user) return "";
  return user.name || user.email;
};

const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'trial':
      return 'Trial';
    case 'active':
      return 'Active';
    case 'canceled':
      return 'Canceled';
    case 'past_due':
      return 'Past Due';
    default:
      return 'Inactive';
  }
};

export default function ProfilePage() {
  const { data: user, loading: userLoading } = useUser();

  // Fetch detailed subscription data
  const { data: subscriptionDetails, isLoading: detailsLoading, error: subscriptionError, refetch: refetchSubscription } = useSubscription();

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Please sign in to view your profile
          </p>
          <Link
            href="/account/signin"
            className="text-[#2E86DE] hover:text-[#2574C7]"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#F3F4F6]"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image
              src="https://ucarecdn.com/6b43f5cf-10b4-4838-b2ba-397c0a896734/-/format/auto/"
              alt="ReimburseMe Logo"
              className="w-10 h-10"
              height={40}
              width={40}
            />
            <div>
              <h1
                className="text-xl font-bold text-gray-900"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                ReimburseMe
              </h1>
              <p className="text-sm text-gray-600">
                Profile & Subscription
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-gray-800 font-medium text-sm"
            >
              Dashboard
            </Link>
            <Link
              href="/account/logout"
              className="text-gray-600 hover:text-gray-800 font-medium text-sm"
            >
              Sign Out
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
          <p className="text-gray-600">Manage your account and view your subscription details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Information */}
          <div className="bg-white rounded-3xl p-8 border border-gray-200">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-[#2E86DE] bg-opacity-10 rounded-2xl flex items-center justify-center">
                <User className="w-8 h-8 text-[#2E86DE]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {getUserDisplayName(user)}
                </h2>
                <p className="text-gray-600">Account Holder</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Email Address</p>
                  <p className="text-gray-900 font-medium">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Display Name</p>
                  <p className="text-gray-900 font-medium">{user.name}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Member Since</p>
                  <p className="text-gray-900 font-medium">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Account Type</p>
                  <p className="text-gray-900 font-medium capitalize">{user.role.toLowerCase()}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <Link
                href="/settings"
                className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                Edit Profile Settings
              </Link>
            </div>
          </div>

          {/* Subscription Information */}
          <div className="bg-white rounded-3xl p-8 border border-gray-200">
            <div className="flex items-center space-x-4 mb-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                subscriptionDetails?.tier === "pro" || subscriptionDetails?.tier === "premium"
                  ? "bg-yellow-100"
                  : "bg-gray-100"
              }`}>
                {subscriptionDetails?.tier === "pro" || subscriptionDetails?.tier === "premium" ? (
                  <Crown className="w-8 h-8 text-yellow-600" />
                ) : (
                  <Receipt className="w-8 h-8 text-gray-600" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 capitalize">
                  {detailsLoading ? "Loading..." : subscriptionDetails?.tier || "Free"} Plan
                </h2>
                <p className="text-gray-600">Current Subscription</p>
              </div>
            </div>

            {detailsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2E86DE]"></div>
                <span className="ml-3 text-gray-600">Loading subscription details...</span>
              </div>
            ) : subscriptionError ? (
              <div className="text-center py-8">
                <p className="text-red-500">Failed to load subscription information</p>
                <button
                  onClick={() => refetchSubscription()}
                  className="mt-4 px-4 py-2 bg-[#2E86DE] hover:bg-[#2574C7] text-white font-medium rounded-xl transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : subscriptionDetails ? (
              <div className="space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    subscriptionDetails.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : subscriptionDetails.status === 'trial'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {getStatusDisplay(subscriptionDetails.status)}
                  </div>
                </div>

                {/* Trial Information */}
                {subscriptionDetails.status === 'trial' && subscriptionDetails.trialEnd && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Free Trial Active</p>
                        <p className="text-sm text-blue-700">
                          Trial ends on {new Date(subscriptionDetails.trialEnd).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Early Adopter Badge */}
                {subscriptionDetails.earlyAdopter && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <Star className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium text-yellow-900">Early Adopter</p>
                        <p className="text-sm text-yellow-700">
                          You get {subscriptionDetails.lifetimeDiscount}% off forever!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Usage Statistics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-2 mb-2">
                      <Receipt className="w-4 h-4 text-[#10B981]" />
                      <h4 className="text-sm font-medium text-gray-700">Receipts This Month</h4>
                    </div>
                    <p className="text-2xl font-bold text-[#10B981]">
                      {subscriptionDetails.usage.receipts}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="w-4 h-4 text-[#8B5CF6]" />
                      <h4 className="text-sm font-medium text-gray-700">Reports This Month</h4>
                    </div>
                    <p className="text-2xl font-bold text-[#8B5CF6]">
                      {subscriptionDetails.usage.reports}
                    </p>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Current Features</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {subscriptionDetails.features.map((feature: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-green-500 shrink-0" />
                        <span className="text-sm text-gray-600 capitalize">
                          {feature.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                  <Link
                    href="/pricing"
                    className="flex-1 text-center px-4 py-2 bg-[#2E86DE] hover:bg-[#2574C7] text-white font-medium rounded-xl transition-colors"
                  >
                    {subscriptionDetails?.tier === "free" ? "Upgrade Plan" : "Manage Plan"}
                  </Link>
                  {subscriptionDetails.status === 'active' && (
                    <button
                      onClick={() => window.open('https://billing.stripe.com/p/login/test_customer_portal', '_blank')}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-xl transition-colors"
                    >
                      Billing Portal
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}