"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { useAuth } from "@/lib/hooks/useAuth";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";

// TypeScript interfaces
interface Metrics {
  receipts_today: number;
  receipts_change: number;
  reports_today: number;
  reports_change: number;
  ocr_success_rate: number;
  ocr_change: number;
  active_subscriptions: number;
  subscription_change: number;
  receipts_30_days: number;
}

interface Anomaly {
  type: string;
  description: string;
  detected_at: string;
}

interface DashboardData {
  metrics: Metrics;
  anomalies: Anomaly[];
}

interface ApiError {
  message: string;
  status?: number;
}

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  createdAt: string;
  receiptsCount: number;
  reportsCount: number;
}

interface KeyMonitoringData {
  keyUsageStats: {
    [key: string]: {
      totalRequests: number;
      successRate: number;
      lastUsed: string;
      errorRate: number;
      averageResponseTime: number;
    };
  };
  recentEvents: Array<{
    timestamp: string;
    keyType: string;
    operation: string;
    success: boolean;
    responseTime: number;
    userId?: string;
    error?: string;
  }>;
  securityAlerts: Array<{
    id: string;
    severity: string;
    type: string;
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
  summary: {
    totalKeys: number;
    activeKeys: number;
    lastValidated: string;
    securityScore: number;
  };
}
interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: string;
}
// API call functions
const fetchDashboardData = async (): Promise<DashboardData> => {
  try {
    const response = await axios.get<DashboardData>("/api/admin/dashboard");
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiError>;

      if (axiosError.response?.status === 403) {
        throw new Error("Access denied. Admin privileges required.");
      }

      throw new Error(
        axiosError.response?.data?.message ||
        "Failed to fetch dashboard data"
      );
    }
    throw new Error("An unexpected error occurred");
  }
};

const fetchUsers = async (): Promise<User[]> => {
  try {
    const response = await axios.get<{ users: User[] }>("/api/admin/users");
    return response.data.users;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiError>;

      if (axiosError.response?.status === 403) {
        throw new Error("Access denied. Admin privileges required.");
      }

      throw new Error(
        axiosError.response?.data?.message ||
        "Failed to fetch users"
      );
    }
    throw new Error("An unexpected error occurred");
  }
};

const fetchKeyMonitoringData = async (): Promise<KeyMonitoringData> => {
  try {
    const response = await axios.get<KeyMonitoringData>("/api/admin/key-monitoring");
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiError>;

      if (axiosError.response?.status === 403) {
        throw new Error("Access denied. Admin privileges required.");
      }

      throw new Error(
        axiosError.response?.data?.message ||
        "Failed to fetch key monitoring data"
      );
    }
    throw new Error("An unexpected error occurred");
  }
};

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin={true}>
      <AdminContent />
    </AuthGuard>
  );
}

function AdminContent() {
  const { user, isLoading: loading } = useAuth();
  const [showKeyRotationModal, setShowKeyRotationModal] = useState(false);
  const [selectedKeyType, setSelectedKeyType] = useState<string>("");
  const [newKey, setNewKey] = useState<string>("");
  const [rotationReason, setRotationReason] = useState<string>("");

  // React Query for data fetching
  const {
    data: dashboardData,
    error: queryError,
    isLoading: loadingMetrics,
    refetch: refetchMetrics,
  } = useQuery<DashboardData, Error>({
    queryKey: ["admin-dashboard"],
    queryFn: fetchDashboardData,
    enabled: !!user && !loading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error.message.includes("Access denied")) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const {
    data: users,
    isLoading: loadingUsers,
  } = useQuery<User[], Error>({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
    enabled: !!user && !loading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const {
    data: keyMonitoringData,
    isLoading: loadingKeyMonitoring,
    refetch: refetchKeyMonitoring,
  } = useQuery<KeyMonitoringData, Error>({
    queryKey: ["admin-key-monitoring"],
    queryFn: fetchKeyMonitoringData,
    enabled: !!user && !loading,
    staleTime: 2 * 60 * 1000, // 2 minutes (more frequent for security data)
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Key rotation mutation
  const rotateKeyMutation = useMutation({
    mutationFn: async ({ keyType, newKey, reason }: { keyType: string; newKey: string; reason: string }) => {
      const response = await axios.post("/api/admin/rotate-keys", {
        keyType,
        newKey,
        reason,
      });
      return response.data;
    },
    onSuccess: () => {
      // Refresh key monitoring data
      refetchKeyMonitoring();
      // Close modal and reset form
      setShowKeyRotationModal(false);
      setSelectedKeyType("");
      setNewKey("");
      setRotationReason("");
      alert("Key rotated successfully!");
    },
    onError: (error: Error) => {
      console.error("Key rotation error:", error);
      alert("Failed to rotate key: " + error.message);
    },
  });

  // Show loading state while auth is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show access denied if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please sign in to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  // Show error state if query failed
  if (queryError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{queryError.message}</p>
          <button 
            onClick={() => refetchMetrics()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Extract data from query result
  const metrics = dashboardData?.metrics;
  const anomalies = dashboardData?.anomalies || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">System metrics and anomaly detection</p>
        </div>

        {loadingMetrics ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading metrics...</p>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Receipts Today"
                value={metrics?.receipts_today || 0}
                change={metrics?.receipts_change || 0}
                icon="📄"
              />
              <MetricCard
                title="Reports Today"
                value={metrics?.reports_today || 0}
                change={metrics?.reports_change || 0}
                icon="📊"
              />
              <MetricCard
                title="OCR Success Rate"
                value={`${Math.round((metrics?.ocr_success_rate || 0) * 100)}%`}
                change={metrics?.ocr_change || 0}
                icon="🔍"
              />
              <MetricCard
                title="Active Subscriptions"
                value={metrics?.active_subscriptions || 0}
                change={metrics?.subscription_change || 0}
                icon="💳"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Receipts Over Time</h3>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📈</div>
                    <p>Chart visualization would go here</p>
                    <p className="text-sm">Last 30 days: {metrics?.receipts_30_days || 0} receipts</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h3>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-4xl mb-2">💰</div>
                    <p>Chart visualization would go here</p>
                    <p className="text-sm">Monthly recurring revenue tracking</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Anomalies Section */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Anomaly Detection</h3>
                <p className="text-sm text-gray-600">Unusual patterns and potential issues</p>
              </div>
              <div className="p-6">
                {anomalies.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">✅</div>
                    <p>No anomalies detected</p>
                    <p className="text-sm">System is running normally</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {anomalies.map((anomaly, index) => (
                      <div key={index} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                        <div className="flex items-start">
                          <div className="shrink-0">
                            <div className="text-yellow-600 text-xl">⚠️</div>
                          </div>
                          <div className="ml-3">
                            <h4 className="text-sm font-medium text-yellow-800">
                              {anomaly.type}
                            </h4>
                            <p className="text-sm text-yellow-700 mt-1">
                              {anomaly.description}
                            </p>
                            <p className="text-xs text-yellow-600 mt-2">
                              Detected: {new Date(anomaly.detected_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* User Management Section */}
            <div className="bg-white rounded-lg shadow mt-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                <p className="text-sm text-gray-600">View and manage user accounts</p>
              </div>
              <div className="p-6">
                {loadingUsers ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading users...</p>
                  </div>
                ) : users && users.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Subscription
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Receipts
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reports
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Joined
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                    <span className="text-sm font-medium text-gray-700">
                                      {user.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {user.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.role === 'ADMIN'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.subscriptionTier === 'pro' || user.subscriptionTier === 'premium'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {user.subscriptionTier || 'free'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.receiptsCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.reportsCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Link
                                href={`/admin/user/${user.id}`}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View Details
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No users found</p>
                  </div>
                )}
              </div>
            </div>

          </>
        )}

        {/* Key Rotation Modal */}
        {showKeyRotationModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Rotate {selectedKeyType} Key</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (selectedKeyType && newKey && rotationReason) {
                    rotateKeyMutation.mutate({
                      keyType: selectedKeyType,
                      newKey,
                      reason: rotationReason,
                    });
                  }
                }}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Key Value
                    </label>
                    <input
                      type="password"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Enter new ${selectedKeyType} key`}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Rotation
                    </label>
                    <input
                      type="text"
                      value={rotationReason}
                      onChange={(e) => setRotationReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Security compromise, regular rotation"
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowKeyRotationModal(false);
                        setSelectedKeyType("");
                        setNewKey("");
                        setRotationReason("");
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={rotateKeyMutation.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {rotateKeyMutation.isPending ? "Rotating..." : "Rotate Key"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, change, icon }: MetricCardProps) {
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className="shrink-0">
          <div className="text-2xl">{icon}</div>
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {change !== 0 && (
              <p className={`ml-2 text-sm font-medium ${
                isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'
              }`}>
                {isPositive ? '+' : ''}{change}%
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}