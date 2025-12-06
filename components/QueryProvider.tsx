"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import axios from "axios";

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error: unknown) => {
          // Don't retry on 401/403 errors (auth issues)
          if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
            return false;
          }
          return failureCount < 3;
        },
      },
    },
  }));

  useEffect(() => {
    // Configure axios defaults for session-based auth
    axios.defaults.withCredentials = true;
    axios.defaults.baseURL = typeof window !== 'undefined' ? window.location.origin : '';
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
