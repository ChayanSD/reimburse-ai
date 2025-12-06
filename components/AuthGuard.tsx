"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export default function AuthGuard({ 
  children, 
  requireAdmin = false, 
  redirectTo = "/account/signin" 
}: AuthGuardProps) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    // Redirect to access denied if admin access is required but user is not admin
    if (requireAdmin && user?.role !== 'ADMIN') {
      router.push("/dashboard");
      return;
    }
  }, [user, isLoading, isAuthenticated, requireAdmin, redirectTo, router]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2E86DE] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated (redirect is happening)
  if (!isAuthenticated) {
    return null;
  }

  // Don't render children if admin access is required but user is not admin
  if (requireAdmin && user?.role !== 'ADMIN') {
    return null;
  }

  return <>{children}</>;
}