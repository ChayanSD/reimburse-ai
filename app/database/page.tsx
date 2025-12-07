"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";

interface DatabaseTable {
  name: string;
  label: string;
  userSpecific: boolean;
}

interface TableData {
  success: boolean;
  rows: Record<string, unknown>[];
  count: number;
}

// API function using axios
const fetchTableData = async (tableName: string): Promise<TableData> => {
  const response = await axios.post("/api/database/view", {
    table: tableName,
  });
  return response.data;
};

export default function DatabasePage() {
  const { user, isLoading: userLoading } = useAuth();
  const [activeTable, setActiveTable] = useState("receipts");

  const tables: DatabaseTable[] = [
    { name: "receipts", label: "Receipts", userSpecific: true },
    { name: "reports", label: "Reports", userSpecific: true },
    { name: "company_settings", label: "Company Settings", userSpecific: true },
    { name: "audit_log", label: "Audit Log", userSpecific: true },
    { name: "auth_users", label: "Users", userSpecific: false },
  ];

  // React Query hook for data fetching
  const {
    data: tableData,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["database-table", activeTable],
    queryFn: () => fetchTableData(activeTable),
    enabled: !!user && !!activeTable,
    retry: 1,
  });

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    if (typeof value === "string" && value.length > 50) {
      return value.substring(0, 50) + "...";
    }
    return String(value);
  };

  const handleRefresh = () => {
    refetch();
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please sign in to view database</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">
              Database Viewer
            </h1>
            <div className="flex gap-3">
              <Link
                href="/debug"
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Debug Page
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Table Selector */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-semibold mb-4">Select Table</h2>
          <div className="flex flex-wrap gap-2">
            {tables.map((table) => (
              <button
                key={table.name}
                onClick={() => setActiveTable(table.name)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  activeTable === table.name
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {table.label}
                {table.userSpecific && (
                  <span className="ml-1 text-xs opacity-75">(Your Data)</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table Data */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {tables.find((t) => t.name === activeTable)?.label}(
                {tableData?.count || 0} rows)
              </h2>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-8 text-gray-600">
                Loading data...
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">
                Error: {error instanceof Error ? error.message : "Unknown error"}
              </div>
            ) : !tableData?.rows || tableData.rows.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No data found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      {Object.keys(tableData.rows[0] || {}).map((column) => (
                        <th
                          key={column}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tableData.rows.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {Object.values(row).map((value, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-4 py-3 text-sm text-gray-900 border-b"
                          >
                            <div className="max-w-xs">{formatValue(value)}</div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Database Schema Info */}
        <div className="bg-white rounded-lg shadow mt-6 p-6">
          <h2 className="text-lg font-semibold mb-4">
            Database Schema Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900">Receipts</h3>
              <p className="text-sm text-blue-700">
                Store uploaded receipt data
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-900">Reports</h3>
              <p className="text-sm text-green-700">
                Generated expense reports
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-900">
                Company Settings
              </h3>
              <p className="text-sm text-purple-700">
                User company information
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold text-yellow-900">Users</h3>
              <p className="text-sm text-yellow-700">
                Authentication & user data
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <h3 className="font-semibold text-red-900">Audit Log</h3>
              <p className="text-sm text-red-700">Track user actions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
