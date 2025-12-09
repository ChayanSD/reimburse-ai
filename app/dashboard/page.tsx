"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useUser from "@/utils/useUser";
import useSubscription from "@/lib/hooks/useSubscription";
import {
  Receipt,
  Upload,
  FileText,
  Filter,
  Download,
  Trash2,
  Eye,
  Plus,
  Crown,
  X,
  AlertCircle,
  Settings,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Types
interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
}

interface AxiosError {
  response?: {
    data?: {
      error?: string;
      code?: string;
      data?: unknown;
    };
  };
}

interface ReceiptItem {
  id: string;
  receipt_date: string | null;
  merchant_name: string | null;
  amount: string | number | null;
  category: string | null;
  file_url: string | null;
}

interface CompanySetting {
  id: number;
  userId: number;
  companyName: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country: string;
  approverName?: string;
  approverEmail?: string;
  department?: string;
  costCenter?: string;
  notes?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Filters {
  dateRange: "all" | "current_month" | "last_30" | "last_90" | "custom";
  customStartDate: string;
  customEndDate: string;
  category: string;
  merchant: string;
}

interface ReportData {
  receipt_ids: number[];
  period_start: string;
  period_end: string;
  title?: string;
  include_items?: boolean;
  format: "csv" | "pdf";
  company_setting_id?: number | null;
}

// API functions
const fetchReceipts = async (): Promise<ReceiptItem[]> => {
  const { data } = await axios.get<{ receipts: ReceiptItem[] }>("/api/receipts");
  return data.receipts || [];
};

const fetchCompanySettings = async (): Promise<CompanySetting[]> => {
  const { data } = await axios.get<{ settings: CompanySetting[] }>("/api/company-settings");
  return data.settings || [];
};

const deleteReceipt = async (receiptId: string): Promise<void> => {
  await axios.delete(`/api/receipts/${receiptId}`);
};

const generateReport = async (reportData: ReportData): Promise<{ download_url: string; filename: string }> => {
  const { data } = await axios.post<{ download_url: string; filename: string }>("/api/reports", reportData);
  return data;
};

// Helper function to get user's display name
const getUserDisplayName = (user: User | null): string => {
  if (!user) return "";

  const firstName = user.first_name?.trim();
  const lastName = user.last_name?.trim();

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  } else if (firstName) {
    return firstName;
  } else if (lastName) {
    return lastName;
  } else {
    return user.email;
  }
};

// Toast notification component
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

function ToastNotification({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) {
  const icons = {
    success: <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-green-600 rounded-full"></div></div>,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-500" />,
    info: <AlertCircle className="w-5 h-5 text-blue-500" />,
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  };

  const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
  };

  return (
    <div className={`flex items-start gap-3 p-4 border rounded-xl ${bgColors[toast.type]} animate-in slide-in-from-right-full duration-300`}>
      {icons[toast.type]}
      <div className="flex-1">
        <p className={`font-medium ${textColors[toast.type]}`}>{toast.title}</p>
        {toast.message && (
          <p className={`text-sm mt-1 ${textColors[toast.type]} opacity-80`}>{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className={`p-1 hover:bg-white hover:bg-opacity-50 rounded ${textColors[toast.type]}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const { data: user, loading: userLoading } = useUser();
  const {
    subscriptionTier,
    loading: subscriptionLoading,
  } = useSubscription();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toast.duration || 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const [filters, setFilters] = useState<Filters>({
    dateRange: "all",
    customStartDate: "",
    customEndDate: "",
    category: "all",
    merchant: "",
  });
  const [selectedCompanySetting, setSelectedCompanySetting] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    receiptId: string | null;
    receiptInfo: string;
  }>({
    open: false,
    receiptId: null,
    receiptInfo: "",
  });

  // Queries
  const {
    data: allReceipts = [],
    isLoading: receiptsLoading,
    error: receiptsError,
  } = useQuery({
    queryKey: ["receipts"],
    queryFn: fetchReceipts,
    enabled: !!user,
  });

  const { data: companySettings = [] } = useQuery<CompanySetting[]>({
    queryKey: ["companySettings"],
    queryFn: fetchCompanySettings,
    enabled: !!user,
    select: (data) => {
      // Set default company setting on first load
      if (data.length > 0 && !selectedCompanySetting) {
        const defaultSetting = data.find((s) => s.isDefault);
        setTimeout(() => {
          setSelectedCompanySetting(defaultSetting?.id ?? data[0].id);
        }, 0);
      }
      return data;
    },
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: deleteReceipt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      addToast({
        type: 'success',
        title: 'Receipt Deleted',
        message: 'The receipt has been successfully deleted.',
        duration: 3000,
      });
    },
    onError: (error: unknown) => {
      console.error("Error deleting receipt:", error);
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete receipt. Please try again.',
        duration: 5000,
      });
    },
  });

  const reportMutation = useMutation({
    mutationFn: generateReport,
    onSuccess: (data) => {
      const link = document.createElement("a");
      link.href = data.download_url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      addToast({
        type: 'success',
        title: 'Report Generated',
        message: 'Your expense report has been downloaded successfully.',
        duration: 3000,
      });
    },
    onError: (error: unknown) => {
      console.error("Error generating report:", error);
      
      // Type guard for axios error
      const axiosError = error as AxiosError;
      
      // Check if it's a subscription limit error
      if (axiosError.response?.data?.code === 'SUBSCRIPTION_LIMIT_REACHED') {
        const errorData = axiosError.response.data;
        
        // Show toast notification
        addToast({
          type: 'warning',
          title: 'Subscription Limit Reached',
          message: errorData.error || 'You have reached your report generation limit.',
          duration: 6000,
        });
        
        // Redirect to plans page after a short delay
        setTimeout(() => {
          router.push('/plans');
        }, 2000);
        
        return;
      }
      
      // Handle other errors
      addToast({
        type: 'error',
        title: 'Report Generation Failed',
        message: axiosError.response?.data?.error || 'Failed to generate report. Please try again.',
        duration: 5000,
      });
    },
  });

  // Client-side filtering function
  const applyFilters = useCallback((receiptsData: ReceiptItem[]): ReceiptItem[] => {
    let filtered = [...receiptsData];

    // Date filtering
    if (filters.dateRange !== "all") {
      const now = new Date();
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      switch (filters.dateRange) {
        case "current_month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case "last_30":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30);
          endDate = now;
          break;
        case "last_90":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 90);
          endDate = now;
          break;
        case "custom":
          if (filters.customStartDate) startDate = new Date(filters.customStartDate);
          if (filters.customEndDate) endDate = new Date(filters.customEndDate);
          break;
      }

      if (startDate && endDate) {
        filtered = filtered.filter((receipt) => {
          if (!receipt.receipt_date) return false;
          const receiptDate = new Date(receipt.receipt_date);
          return receiptDate >= startDate! && receiptDate <= endDate!;
        });
      }
    }

    // Category filtering
    if (filters.category !== "all") {
      filtered = filtered.filter(
        (receipt) => (receipt.category || "Other") === filters.category
      );
    }

    // Merchant filtering
    if (filters.merchant.trim()) {
      const merchantSearch = filters.merchant.toLowerCase().trim();
      filtered = filtered.filter((receipt) =>
        (receipt.merchant_name || "").toLowerCase().includes(merchantSearch)
      );
    }

    return filtered;
  }, [filters]);

  // Memoized filtered receipts
  const receipts = useMemo(() => applyFilters(allReceipts), [allReceipts, applyFilters]);

  const handleDeleteReceipt = async (receiptId: string) => {
    const receipt = allReceipts.find(r => r.id === receiptId);
    const receiptInfo = receipt 
      ? `${receipt.merchant_name || "Unknown Merchant"} - ${parseFloat(String(receipt.amount) || "0").toFixed(2)}`
      : "this receipt";
    
    setDeleteModal({
      open: true,
      receiptId,
      receiptInfo,
    });
  };

  const confirmDeleteReceipt = () => {
    if (deleteModal.receiptId) {
      deleteMutation.mutate(deleteModal.receiptId);
    }
    setDeleteModal({
      open: false,
      receiptId: null,
      receiptInfo: "",
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      open: false,
      receiptId: null,
      receiptInfo: "",
    });
  };

  const handleGenerateReport = async (format: "csv" | "pdf") => {
    // Calculate date range based on filters
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (filters.dateRange) {
      case "current_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "last_30":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        break;
      case "last_90":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 90);
        break;
      case "custom":
        startDate = filters.customStartDate ? new Date(filters.customStartDate) : new Date(0);
        endDate = filters.customEndDate ? new Date(filters.customEndDate) : now;
        break;
      default:
        // "all" - use earliest receipt date or 90 days ago, whichever is later
        if (receipts.length > 0) {
          const dates = receipts
            .map(r => r.receipt_date ? new Date(r.receipt_date) : null)
            .filter((d): d is Date => d !== null && !isNaN(d.getTime()));
          startDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date(now.getFullYear(), now.getMonth() - 3, 1);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        }
        break;
    }

    // Format dates as YYYY-MM-DD
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const reportData: ReportData = {
      receipt_ids: receipts.map((r) => Number(r.id)), // Convert string to number
      period_start: formatDate(startDate),
      period_end: formatDate(endDate),
      format,
      company_setting_id: selectedCompanySetting, // Already a number
    };
    reportMutation.mutate(reportData);
  };

  const resetFilters = () => {
    setFilters({
      dateRange: "all",
      customStartDate: "",
      customEndDate: "",
      category: "all",
      merchant: "",
    });
  };

  const monthlyTotal = receipts.reduce(
    (sum, receipt) => sum + (parseFloat(String(receipt.amount)) || 0),
    0
  );

  const categoryTotals = receipts.reduce<Record<string, number>>((acc, receipt) => {
    const category = receipt.category || "Other";
    acc[category] = (acc[category] || 0) + (parseFloat(String(receipt.amount)) || 0);
    return acc;
  }, {});

  const loading = receiptsLoading;
  const error = receiptsError ? "Failed to load receipts" : null;

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
            Please sign in to access your dashboard
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
    <>
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onClose={removeToast}
          />
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteModal.open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteModal.receiptInfo}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteModal}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteReceipt}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Receipt"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  Welcome back, {getUserDisplayName(user as User)}
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4">
              <Link
                href="/company-settings"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium text-sm md:text-base"
                title="Company Settings"
              >
                <Settings size={18} />
                <span className="hidden md:inline">Company Settings</span>
              </Link>
              {(user as User)?.is_admin && (
                <Link
                  href="/admin"
                  className="text-gray-600 hover:text-gray-800 font-medium text-sm md:text-base"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/upload"
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[#2E86DE] hover:bg-[#2574C7] text-white font-medium rounded-2xl transition-colors text-sm md:text-base"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Upload Receipt</span>
              </Link>
              <Link
                href="/account/logout"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium text-sm md:text-base"
                title="Sign Out"
              >
                <LogOut size={18} />
                <span className="hidden md:inline">Sign Out</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-3xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Filtered Total
                </h3>
                <div className="w-10 h-10 bg-[#10B981] bg-opacity-10 rounded-2xl flex items-center justify-center">
                  <FileText size={20} className="text-[#10B981]" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#10B981]">
                ${monthlyTotal.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {receipts.length} of {allReceipts.length} receipts
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Top Category
                </h3>
                <div className="w-10 h-10 bg-[#2E86DE] bg-opacity-10 rounded-2xl flex items-center justify-center">
                  <Filter size={20} className="text-[#2E86DE]" />
                </div>
              </div>
              {Object.keys(categoryTotals).length > 0 ? (
                <>
                  <p className="text-2xl font-bold text-gray-900">
                    {Object.entries(categoryTotals).sort(
                      ([, a], [, b]) => b - a
                    )[0]?.[0] || "None"}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    $
                    {Object.entries(categoryTotals)
                      .sort(([, a], [, b]) => b - a)[0]?.[1]
                      ?.toFixed(2) || "0.00"}
                  </p>
                </>
              ) : (
                <p className="text-xl text-gray-500">No data</p>
              )}
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  All Time Total
                </h3>
                <div className="w-10 h-10 bg-[#8B5CF6] bg-opacity-10 rounded-2xl flex items-center justify-center">
                  <Receipt size={20} className="text-[#8B5CF6]" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#8B5CF6]">
                $
                {allReceipts
                  .reduce(
                    (sum, receipt) => sum + (parseFloat(String(receipt.amount)) || 0),
                    0
                  )
                  .toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {allReceipts.length} total receipts
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Subscription
                </h3>
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    subscriptionTier === "pro" || subscriptionTier === "premium"
                      ? "bg-yellow-100"
                      : "bg-gray-100"
                  }`}
                >
                  {subscriptionTier === "pro" ||
                  subscriptionTier === "premium" ? (
                    <Crown size={20} className="text-yellow-600" />
                  ) : (
                    <Receipt size={20} className="text-gray-600" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-2xl font-bold text-gray-900 capitalize">
                  {subscriptionLoading
                    ? "Loading..."
                    : subscriptionTier || "Free"}
                </p>
                {(subscriptionTier === "pro" ||
                  subscriptionTier === "premium") && (
                  <div className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-lg">
                    Active
                  </div>
                )}
              </div>
              <Link
                href="/pricing"
                className="text-sm text-[#2E86DE] hover:text-[#2574C7] mt-1 inline-block"
              >
                {subscriptionTier === "free" ? "Upgrade Plan" : "Manage Plan"}
              </Link>
            </div>
          </div>

          {/* Enhanced Filters and Actions */}
          <div className="bg-white rounded-3xl p-4 md:p-6 border border-gray-200 mb-6">
            {/* Main Filter Grid - Mobile Optimized */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6 mb-6">
              {/* Company Selection */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report For
                </label>
                {companySettings.length > 0 ? (
                  <Select
                    value={selectedCompanySetting?.toString() || ""}
                    onValueChange={(value) => setSelectedCompanySetting(value ? Number(value) : null)}
                  >
                    <SelectTrigger className="w-full h-9 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent text-sm bg-white">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-300 rounded-xl shadow-lg">
                      {companySettings.map((setting) => (
                        <SelectItem key={setting.id} value={String(setting.id)} className="text-sm">
                          {setting.companyName}
                          {setting.isDefault && " (Default)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <div className="px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-gray-500 text-sm h-9 flex items-center">
                      No company settings found
                    </div>
                    <Link
                      href="/company-settings"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-[#2E86DE] hover:bg-[#2574C7] text-white font-medium rounded-xl transition-colors text-sm"
                    >
                      <Settings size={16} />
                      Add Company Settings
                    </Link>
                  </div>
                )}
              </div>

              {/* Date Range Filter */}
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <Select
                  value={filters.dateRange}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateRange: value as Filters["dateRange"],
                    }))
                  }
                >
                  <SelectTrigger className="w-full h-9 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-300 rounded-xl shadow-lg">
                    <SelectItem value="all" className="text-sm">All Time</SelectItem>
                    <SelectItem value="last_30" className="text-sm">Last 30 Days</SelectItem>
                    <SelectItem value="last_90" className="text-sm">Last 90 Days</SelectItem>
                    <SelectItem value="current_month" className="text-sm">Current Month</SelectItem>
                    <SelectItem value="custom" className="text-sm">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <Select
                  value={filters.category}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      category: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full h-9 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-300 rounded-xl shadow-lg">
                    <SelectItem value="all" className="text-sm">All Categories</SelectItem>
                    <SelectItem value="Meals" className="text-sm">Meals</SelectItem>
                    <SelectItem value="Travel" className="text-sm">Travel</SelectItem>
                    <SelectItem value="Supplies" className="text-sm">Supplies</SelectItem>
                    <SelectItem value="Other" className="text-sm">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Merchant Search */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Merchant
                </label>
                <input
                  type="text"
                  value={filters.merchant}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      merchant: e.target.value,
                    }))
                  }
                  placeholder="Search merchant..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent text-sm"
                />
              </div>

              {/* Reset Button */}
              <div className="sm:col-span-2 lg:col-span-2 flex items-end">
                <button
                  onClick={resetFilters}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-xl transition-colors text-sm"
                >
                  Reset Filters
                </button>
              </div>
            </div>

            {/* Custom Date Range - Only shown when custom is selected */}
            {filters.dateRange === "custom" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.customStartDate}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        customStartDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.customEndDate}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        customEndDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent text-sm"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={() => handleGenerateReport("csv")}
                disabled={reportMutation.isPending || receipts.length === 0}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-white font-medium rounded-xl transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                <Download size={18} />
                CSV Report
              </button>
              <button
                onClick={() => handleGenerateReport("pdf")}
                disabled={reportMutation.isPending || receipts.length === 0}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-[#2E86DE] hover:bg-[#2574C7] text-white font-medium rounded-xl transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                <Download size={18} />
                PDF Report
              </button>
            </div>

            {/* Filter Status */}
            {(filters.dateRange !== "all" ||
              filters.category !== "all" ||
              filters.merchant.trim()) && (
              <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-blue-800">
                    <span className="font-medium">Active filters:</span>
                    {filters.dateRange !== "all" && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 rounded-lg">
                        {filters.dateRange === "custom"
                          ? "Custom dates"
                          : filters.dateRange.replace("_", " ")}
                      </span>
                    )}
                    {filters.category !== "all" && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 rounded-lg">
                        {filters.category}
                      </span>
                    )}
                    {filters.merchant.trim() && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 rounded-lg">
                        &ldquo;{filters.merchant}&rdquo;
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-blue-600 font-medium">
                    {receipts.length} receipts found
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Receipts Table */}
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Receipts</h2>
            </div>

            {loading ? (
              <div className="p-6 text-center">
                <div className="text-gray-600">Loading receipts...</div>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <div className="text-red-600">{error}</div>
              </div>
            ) : receipts.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-gray-500 mb-4">
                  {allReceipts.length === 0
                    ? "No receipts found. Upload your first receipt to get started!"
                    : "No receipts match your current filters"}
                </div>
                {allReceipts.length === 0 ? (
                  <Link
                    href="/upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#2E86DE] hover:bg-[#2574C7] text-white font-medium rounded-2xl transition-colors"
                  >
                    <Upload size={18} />
                    Upload Your First Receipt
                  </Link>
                ) : (
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-2xl transition-colors"
                  >
                    <Filter size={18} />
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Merchant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {receipts.map((receipt) => (
                      <tr key={receipt.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {receipt.receipt_date || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {receipt.merchant_name || "Unknown"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#10B981]">
                          ${parseFloat(String(receipt.amount) || "0").toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-lg">
                            {receipt.category || "Other"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {receipt.file_url && (
                              <button
                                onClick={() =>
                                  window.open(receipt.file_url!, "_blank")
                                }
                                className="text-[#2E86DE] hover:text-[#2574C7] p-1"
                                title="View Receipt"
                              >
                                <Eye size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteReceipt(receipt.id)}
                              disabled={deleteMutation.isPending}
                              className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
                              title="Delete Receipt"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
