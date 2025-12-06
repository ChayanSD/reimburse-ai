"use client";

import { useQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { useAuth } from "@/lib/hooks/useAuth";
import AuthGuard from "@/components/AuthGuard";

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

// API call function
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

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin={true}>
      <AdminContent />
    </AuthGuard>
  );
}

function AdminContent() {
  const { user, isLoading: loading } = useAuth();

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
          </>
        )}
      </div>
    </div>
  );
}

// TypeScript interface for MetricCard props
interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: string;
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