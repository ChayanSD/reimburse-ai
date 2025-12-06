"use client";

import { useAuth } from "@/lib/hooks/useAuth";

export default function useUser() {
  const { user, isLoading } = useAuth();
  
  return {
    data: user,
    loading: isLoading,
  };
}