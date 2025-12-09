"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Check, Star, Crown, Zap } from "lucide-react";
import axios, { AxiosError } from "axios";

// TypeScript Interfaces
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

interface ApiResponse {
  success?: boolean;
  subscription?: SubscriptionData;
  error?: string;
  message?: string;
}

interface DeleteAccountResponse {
  success: boolean;
  message: string;
}

// React Query Hooks
const useSubscription = () => {
  return useQuery<SubscriptionData>({
    queryKey: ['subscription'],
    queryFn: async () => {
      const response = await axios.get<ApiResponse>('/api/user/subscription');
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      if (!response.data.subscription) {
        throw new Error('No subscription data received');
      }
      return response.data.subscription;
    },
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

const useDownloadData = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await axios.post<Blob>('/api/exports/csv', {
        format: 'csv',
        include_all: true
      }, {
        responseType: 'blob'
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reimburseme-data-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
};

const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation<DeleteAccountResponse, AxiosError, string>({
    mutationFn: async (confirmation: string) => {
      const response = await axios.post<DeleteAccountResponse>('/api/account/delete', {
        confirm: confirmation
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.clear();
      // Redirect after successful deletion
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    },
  });
};

// Helper functions
const getTierIcon = (tier: string) => {
  switch (tier) {
    case 'free':
      return <Zap className="w-5 h-5 text-gray-400" />;
    case 'pro':
      return <Star className="w-5 h-5 text-blue-400" />;
    case 'premium':
      return <Crown className="w-5 h-5 text-yellow-400" />;
    default:
      return <Zap className="w-5 h-5 text-gray-400" />;
  }
};

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'free':
      return 'text-gray-400';
    case 'pro':
      return 'text-blue-400';
    case 'premium':
      return 'text-yellow-400';
    default:
      return 'text-gray-400';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'text-green-400';
    case 'trial':
      return 'text-blue-400';
    case 'canceled':
      return 'text-red-400';
    case 'past_due':
      return 'text-orange-400';
    default:
      return 'text-gray-400';
  }
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

// Main Component
export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string }>({ 
    type: 'info', 
    text: '' 
  });

  // React Query hooks
  const { data: subscription, isLoading: subscriptionLoading, error: subscriptionError, refetch: refetchSubscription } = useSubscription();
  const downloadDataMutation = useDownloadData();
  const deleteAccountMutation = useDeleteAccount();

  // Effects
  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    if (type !== 'error') {
      setTimeout(() => setMessage({ type: 'info', text: '' }), 5000);
    }
  };

  // Event handlers
  const handleUpgrade = () => {
    window.location.href = "/pricing";
  };

  const handleDownloadData = () => {
    downloadDataMutation.mutate(undefined, {
      onSuccess: () => {
        showMessage('success', 'Data download started successfully!');
      },
      onError: (error) => {
        console.error('Download error:', error);
        showMessage('error', 'Failed to download data. Please try again.');
      }
    });
  };

  const handleDeleteAccount = () => {
    if (deleteConfirm !== "DELETE") {
      showMessage('error', "Please type 'DELETE' to confirm account deletion.");
      return;
    }

    deleteAccountMutation.mutate(deleteConfirm, {
      onSuccess: () => {
        showMessage('success', 'Account deleted successfully. Redirecting...');
      },
      onError: (error) => {
        console.error('Delete error:', error);
        const errorMessage = (error.response?.data as { message?: string })?.message || "Failed to delete account. Please try again.";
        showMessage('error', errorMessage);
      }
    });
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteConfirm("");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Authentication check
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please sign in to access settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Manage your account and data</p>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" :
            message.type === "error" ? "bg-red-50 text-red-800 border border-red-200" :
            "bg-blue-50 text-blue-800 border border-blue-200"
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-8">
          {/* Account Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{user.email}</p>
              </div>
              {user.name && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{user.name}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{user.role.toLowerCase()}</p>
              </div>
            </div>
          </div>

          {/* Subscription Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription</h2>
            {subscriptionLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading subscription...</span>
              </div>
            ) : subscriptionError ? (
              <div className="text-center py-8">
                <p className="text-red-500">Failed to load subscription information</p>
                <Button onClick={() => refetchSubscription()} className="mt-4">
                  Retry
                </Button>
              </div>
            ) : subscription ? (
              <div className="space-y-6">
                {/* Current Plan */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getTierIcon(subscription.tier)}
                    <div>
                      <h3 className={`text-lg font-semibold capitalize ${getTierColor(subscription.tier)}`}>
                        {subscription.tier} Plan
                      </h3>
                      <p className={`text-sm ${getStatusColor(subscription.status)}`}>
                        {getStatusDisplay(subscription.status)}
                      </p>
                    </div>
                  </div>
                  {subscription.tier === 'free' && (
                    <Button onClick={handleUpgrade} className="bg-blue-600 hover:bg-blue-700">
                      Upgrade Plan
                    </Button>
                  )}
                </div>

                {/* Trial Information */}
                {subscription.status === 'trial' && subscription.trialEnd && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Free Trial Active</p>
                        <p className="text-sm text-blue-700">
                          Trial ends on {new Date(subscription.trialEnd).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Early Adopter Badge */}
                {subscription.earlyAdopter && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Star className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium text-yellow-900">Early Adopter</p>
                        <p className="text-sm text-yellow-700">
                          You get {subscription.lifetimeDiscount}% off forever!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Usage Statistics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700">Receipts This Month</h4>
                    <p className="text-2xl font-bold text-gray-900">{subscription.usage.receipts}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700">Reports This Month</h4>
                    <p className="text-2xl font-bold text-gray-900">{subscription.usage.reports}</p>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Current Features</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {subscription.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-600 capitalize">
                          {feature.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <Button onClick={handleUpgrade} className="bg-blue-600 hover:bg-blue-700">
                    {subscription.tier === 'free' ? 'Upgrade Plan' : 'Change Plan'}
                  </Button>
                  {subscription.status === 'active' && (
                    <Button 
                      variant="outline" 
                      onClick={() => window.open('https://billing.stripe.com/p/login/test_customer_portal', '_blank')}
                    >
                      Manage Billing
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Data Management */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Management</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Download Your Data</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Download all your receipts and reports in CSV format.
                </p>
                <Button
                  onClick={handleDownloadData}
                  disabled={downloadDataMutation.isPending}
                  variant="outline"
                >
                  {downloadDataMutation.isPending ? 'Preparing...' : '📥 Download Data (CSV)'}
                </Button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-lg shadow border border-red-200 p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-4">Danger Zone</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-red-900 mb-2">Delete Account</h3>
                <p className="text-sm text-red-700 mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Button
                  onClick={() => setShowDeleteModal(true)}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  🗑️ Delete Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <span className="text-red-600 text-xl">⚠️</span>
              </div>
              <div className="mt-2 text-center">
                <h3 className="text-lg font-medium text-gray-900">Delete Account</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    This will permanently delete your account and all data. Type <strong>DELETE</strong> to confirm.
                  </p>
                </div>
                <div className="mt-4">
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div className="mt-6 flex justify-center space-x-4">
                  <Button
                    onClick={closeDeleteModal}
                    variant="outline"
                    disabled={deleteAccountMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={deleteAccountMutation.isPending || deleteConfirm !== "DELETE"}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
