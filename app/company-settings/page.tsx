"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/useAuth";
import axios from "axios";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  Building2,
  Plus,
  Save,
  Trash2,
  Edit3,
  Star,
  StarOff,
} from "lucide-react";
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
import Link from "next/link";

// TypeScript interfaces
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

interface CompanySettingsResponse {
  settings: CompanySetting[];
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  message?: string;
  setting?: T;
  settings?: T[];
}

interface ApiErrorResponse {
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
  message?: string;
}

interface AxiosErrorResponse {
  response?: {
    data: ApiErrorResponse;
  };
}

interface FormData {
  setting_name: string;
  company_name: string;
  approver_name: string;
  approver_email: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  department: string;
  cost_center: string;
  notes: string;
  is_default: boolean;
  id?: number;
}

// API functions
const apiClient = axios.create({
  baseURL: '/api',
});

const fetchCompanySettings = async (): Promise<CompanySettingsResponse> => {
  const response = await apiClient.get<CompanySettingsResponse>('/company-settings');
  return response.data;
};

const createOrUpdateCompanySetting = async (data: FormData): Promise<ApiResponse<CompanySetting>> => {
  const response = await apiClient.post<ApiResponse<CompanySetting>>('/company-settings', data);
  return response.data;
};

const deleteCompanySetting = async (id: number): Promise<ApiResponse<null>> => {
  const response = await apiClient.delete<ApiResponse<null>>(`/company-settings?id=${id}`);
  return response.data;
};

const setDefaultCompanySetting = async (data: Partial<FormData> & { id: number }): Promise<ApiResponse<CompanySetting>> => {
  const response = await apiClient.post<ApiResponse<CompanySetting>>('/company-settings', data);
  return response.data;
};

export default function CompanySettingsPage() {
  const { user, isLoading: userLoading } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    settingId: number | null;
    settingInfo: string;
  }>({
    isOpen: false,
    settingId: null,
    settingInfo: "",
  });
  const [formData, setFormData] = useState<FormData>({
    setting_name: "",
    company_name: "",
    approver_name: "",
    approver_email: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    zip_code: "",
    country: "United States",
    department: "",
    cost_center: "",
    notes: "",
    is_default: false,
  });

  // React Query hooks
  const { 
    data: settingsResponse, 
    isLoading: loading, 
    error 
  } = useQuery({
    queryKey: ['company-settings'],
    queryFn: fetchCompanySettings,
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const settings = settingsResponse?.settings || [];

  const saveMutation = useMutation({
    mutationFn: createOrUpdateCompanySetting,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      resetForm();
      setValidationErrors({});
      toast.success(data.message || "Settings saved successfully");
    },
    onError: (error: AxiosErrorResponse) => {
      console.error("Error saving settings:", error);
      const errorData = error.response?.data as ApiErrorResponse;
      
      if (errorData?.details) {
        // Handle field-specific validation errors
        const fieldErrors: Record<string, string> = {};
        errorData.details.forEach(detail => {
          fieldErrors[detail.field] = detail.message;
        });
        setValidationErrors(fieldErrors);
        
        // Show first error message
        const firstError = errorData.details[0];
        toast.error(`${firstError.message} (${firstError.field})`);
      } else {
        setValidationErrors({});
        toast.error(errorData?.error || errorData?.message || "Failed to save settings");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCompanySetting,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      if (editingId && !settings.find(s => s.id === editingId)) {
        resetForm();
      }
      toast.success(data.message || "Setting deleted successfully");
    },
    onError: (error: AxiosErrorResponse) => {
      console.error("Error deleting setting:", error);
      toast.error(error.response?.data?.error || "Failed to delete setting");
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: setDefaultCompanySetting,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success(data.message || "Default setting updated successfully");
    },
    onError: (error: AxiosErrorResponse) => {
      console.error("Error setting default:", error);
      toast.error(error.response?.data?.error || "Failed to set as default");
    },
  });

  const resetForm = () => {
    setFormData({
      setting_name: "",
      company_name: "",
      approver_name: "",
      approver_email: "",
      address_line_1: "",
      address_line_2: "",
      city: "",
      state: "",
      zip_code: "",
      country: "United States",
      department: "",
      cost_center: "",
      notes: "",
      is_default: false,
    });
    setEditingId(null);
    setValidationErrors({});
  };

  const handleEdit = (setting: CompanySetting) => {
    // Map from database field names to form field names
    setFormData({
      setting_name: setting.companyName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      company_name: setting.companyName || "",
      approver_name: setting.approverName || "",
      approver_email: setting.approverEmail || "",
      address_line_1: setting.addressLine1 || "",
      address_line_2: setting.addressLine2 || "",
      city: setting.city || "",
      state: setting.state || "",
      zip_code: setting.zipCode || "",
      country: setting.country || "United States",
      department: setting.department || "",
      cost_center: setting.costCenter || "",
      notes: setting.notes || "",
      is_default: setting.isDefault,
    });
    setEditingId(setting.id);
  };

  const handleSave = async () => {
    // Validation
    if (
      !formData.company_name ||
      !formData.approver_name ||
      !formData.approver_email
    ) {
      toast.error("Company name, approver name, and approver email are required.");
      return;
    }

    // Generate setting name if creating new
    const updatedFormData = { ...formData };
    if (!editingId && !formData.setting_name) {
      const baseName = formData.company_name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_");
      updatedFormData.setting_name = baseName;
    }

    // Include editing ID when updating
    if (editingId) {
      updatedFormData.id = editingId;
    }

    saveMutation.mutate(updatedFormData);
  };

  const handleDelete = async (settingId: number) => {
    const setting = settings.find(s => s.id === settingId);
    const settingInfo = setting ? setting.companyName : "this company setting";
    
    setDeleteModal({
      isOpen: true,
      settingId,
      settingInfo,
    });
  };

  const confirmDeleteSetting = () => {
    if (deleteModal.settingId) {
      deleteMutation.mutate(deleteModal.settingId);
    }
    setDeleteModal({
      isOpen: false,
      settingId: null,
      settingInfo: "",
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      settingId: null,
      settingInfo: "",
    });
  };

  const handleSetDefault = async (settingId: number) => {
    const setting = settings.find((s) => s.id === settingId);
    if (!setting) return;

    // Map from database field names to form field names
    const settingData = {
      setting_name: setting.companyName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      company_name: setting.companyName || "",
      approver_name: setting.approverName || "",
      approver_email: setting.approverEmail || "",
      address_line_1: setting.addressLine1 || "",
      address_line_2: setting.addressLine2 || "",
      city: setting.city || "",
      state: setting.state || "",
      zip_code: setting.zipCode || "",
      country: setting.country || "United States",
      department: setting.department || "",
      cost_center: setting.costCenter || "",
      notes: setting.notes || "",
      is_default: true,
      id: setting.id,
    };

    setDefaultMutation.mutate(settingData);
  };

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
            Please sign in to access settings
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
                width={40}
                height={40}
              />
              <div>
                <h1
                  className="text-xl font-bold text-gray-900"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Company Settings
                </h1>
                <p className="text-sm text-gray-600">
                  Manage your company and client details for expense reports
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-800 font-medium"
              >
                Back to Dashboard
              </Link>
              <Link
                href="/account/logout"
                className="text-gray-600 hover:text-gray-800 font-medium"
              >
                Sign Out
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Settings List */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Your Company Settings
                </h2>
                <button
                  onClick={() => {
                    resetForm();
                    setFormData((prev) => ({
                      ...prev,
                      setting_name: `company_${Date.now()}`,
                    }));
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2E86DE] hover:bg-[#2574C7] text-white font-medium rounded-2xl transition-colors"
                >
                  <Plus size={18} />
                  Add New Company
                </button>
              </div>

              {loading ? (
                <div className="bg-white rounded-3xl p-6 border border-gray-200">
                  <div className="text-gray-600">Loading settings...</div>
                </div>
              ) : error ? (
                <div className="bg-white rounded-3xl p-6 border border-gray-200">
                  <div className="text-red-600">Failed to load settings. Please try again.</div>
                </div>
              ) : settings.length === 0 ? (
                <div className="bg-white rounded-3xl p-6 border border-gray-200 text-center">
                  <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 mb-4">
                    No company settings found
                  </p>
                  <p className="text-sm text-gray-400">
                    Create your first company setting to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {settings.map((setting) => (
                    <div
                      key={setting.id}
                      className={`bg-white rounded-3xl p-6 border transition-all ${
                        editingId === setting.id
                          ? "border-[#2E86DE] ring-2 ring-[#2E86DE] ring-opacity-20"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                              setting.isDefault
                                ? "bg-yellow-100"
                                : "bg-gray-100"
                            }`}
                          >
                            {setting.isDefault ? (
                              <Star
                                size={20}
                                className="text-yellow-600 fill-current"
                              />
                            ) : (
                              <Building2 size={20} className="text-gray-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                              {setting.companyName}
                              {setting.isDefault && (
                                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-lg font-medium">
                                  Default
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {setting.approverName}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!setting.isDefault && (
                            <button
                              onClick={() => handleSetDefault(setting.id)}
                              disabled={setDefaultMutation.isPending}
                              className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-xl transition-colors disabled:opacity-50"
                              title="Set as default"
                            >
                              <StarOff size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(setting)}
                            className="p-2 text-gray-400 hover:text-[#2E86DE] hover:bg-blue-50 rounded-xl transition-colors"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(setting.id)}
                            disabled={deleteMutation.isPending}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Approver Email</div>
                          <div className="font-medium">
                            {setting.approverEmail}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Department</div>
                          <div className="font-medium">
                            {setting.department || "N/A"}
                          </div>
                        </div>
                        {(setting.city || setting.state) && (
                          <div className="col-span-2">
                            <div className="text-gray-500">Address</div>
                            <div className="font-medium">
                              {[
                                setting.addressLine1,
                                setting.city,
                                setting.state,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Edit Form */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200 h-fit sticky top-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                {editingId ? "Edit Company Setting" : "Add New Company Setting"}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        company_name: e.target.value,
                      }))
                    }
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent ${
                      validationErrors.company_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g. Acme Corporation"
                  />
                  {validationErrors.company_name && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.company_name}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Approver Name *
                    </label>
                    <input
                      type="text"
                      value={formData.approver_name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          approver_name: e.target.value,
                        }))
                      }
                      className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent ${
                        validationErrors.approver_name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="e.g. John Smith"
                    />
                    {validationErrors.approver_name && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.approver_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Approver Email *
                    </label>
                    <input
                      type="email"
                      value={formData.approver_email}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          approver_email: e.target.value,
                        }))
                      }
                      className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent ${
                        validationErrors.approver_email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="john@company.com"
                    />
                    {validationErrors.approver_email && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.approver_email}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={formData.address_line_1}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        address_line_1: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent"
                    placeholder="123 Business Street"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={formData.address_line_2}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        address_line_2: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent"
                    placeholder="Suite 100"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent"
                      placeholder="San Francisco"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          state: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent"
                      placeholder="CA"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={formData.zip_code}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          zip_code: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent"
                      placeholder="94105"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          department: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent"
                      placeholder="Engineering"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cost Center
                    </label>
                    <input
                      type="text"
                      value={formData.cost_center}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          cost_center: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent"
                      placeholder="CC-1001"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent"
                    placeholder="Additional notes or instructions..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_default: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-[#2E86DE] border-gray-300 rounded focus:ring-[#2E86DE]"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Set as default company setting
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Setting Name *
                  </label>
                  <input
                    type="text"
                    value={formData.setting_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        setting_name: e.target.value,
                      }))
                    }
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent ${
                      validationErrors.setting_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g. company_default"
                  />
                  {validationErrors.setting_name && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.setting_name}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    This will be used as a unique identifier for this company setting
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#2E86DE] hover:bg-[#2574C7] disabled:opacity-50 text-white font-medium rounded-2xl transition-colors"
                  >
                    <Save size={18} />
                    {saveMutation.isPending
                      ? "Saving..."
                      : editingId
                        ? "Update Setting"
                        : "Save Setting"}
                  </button>

                  <button
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-2xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={deleteModal.isOpen} onOpenChange={(open) => !open && closeDeleteModal()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company Setting</AlertDialogTitle>
            <AlertDialogDescription>
              {`Are you sure you want to delete "${deleteModal.settingInfo}"? This action cannot be undone and will affect any reports using this setting.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSetting}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Setting"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
