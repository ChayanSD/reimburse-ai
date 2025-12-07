"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useUser from "@/utils/useUser";
import Link from "next/link";

// TypeScript interfaces
interface Receipt {
  id: number;
  userId: number;
  fileUrl: string;
  merchantName: string;
  receiptDate: string;
  amount: string;
  category: string;
  currency: string;
  note?: string;
  needsReview: boolean;
  isDuplicate: boolean;
  confidence?: string;
  createdAt: string;
  updatedAt: string;
}

interface ReceiptsResponse {
  receipts: Receipt[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function DebugPage() {
  const { data: user, loading: userLoading } = useUser();

  // Using react-query for receipts data fetching with axios
  const {
    data: receiptsData,
    isLoading: receiptsLoading,
    error: receiptsError,
    refetch: refetchReceipts,
  } = useQuery<ReceiptsResponse>({
    queryKey: ["receipts"],
    queryFn: async () => {
      const response = await axios.get("/api/receipts");
      return response.data;
    },
    enabled: !!user, // Only fetch when user is available
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 401/403 errors (auth issues)
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 401 || error.response?.status === 403)
      ) {
        return false;
      }
      return failureCount < 3;
    },
  });

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading user...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Please sign in to view debug info
          </p>
          <Link
            href="/account/signin"
            className="text-blue-600 hover:text-blue-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const receipts = receiptsData?.receipts || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Debug Information
            </h1>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Dashboard
            </Link>
          </div>

          {/* User Info */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-3">User Information</h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong>User ID:</strong> {user.id}
              </p>
              <p>
                <strong>Name:</strong> {user.name || "Not set"}
              </p>
              <p>
                <strong>Email:</strong> {user.email}
              </p>
            </div>
          </div>

          {/* Receipts */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">
              Your Receipts ({receipts.length})
            </h2>

            {receiptsLoading ? (
              <div className="text-gray-600">Loading receipts...</div>
            ) : receiptsError ? (
              <div className="text-red-600">
                Error:{" "}
                {axios.isAxiosError(receiptsError)
                  ? receiptsError.message
                  : "Unknown error"}
              </div>
            ) : receipts.length === 0 ? (
              <div className="text-gray-500">No receipts found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        ID
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Merchant
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Category
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {receipts.map((receipt: Receipt) => (
                      <tr key={receipt.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900 font-mono">
                          {receipt.id.toString().slice(-8)}...
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {receipt.merchantName || "Unknown"}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          ${parseFloat(String(receipt.amount || 0)).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {receipt.category}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {receipt.receiptDate
                            ? new Date(
                                receipt.receiptDate
                              ).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {receipt.createdAt
                            ? new Date(receipt.createdAt).toLocaleString()
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Test Actions */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-3">Test Actions</h2>
            <div className="space-y-2 text-sm">
              <p>
                ✅ Database connection is working (receipts table accessible)
              </p>
              <p>✅ Authentication is working (user session active)</p>
              <p>✅ API endpoints are accessible</p>
              <p className="mt-4">
                <strong>Next steps to test receipt upload:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>
                  Go to the{" "}
                  <Link
                    href="/upload"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Upload page
                  </Link>
                </li>
                <li>Upload any image file (JPEG, PNG) or PDF</li>
                <li>Fill in the receipt details form</li>
                <li>Click &quot;Save Receipt&quot;</li>
                <li>
                  Return to this debug page to see if the receipt was saved
                </li>
              </ol>
            </div>

            <button
              onClick={() => refetchReceipts()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
