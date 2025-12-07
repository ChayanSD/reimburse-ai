"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import Image from "next/image";


interface SignInFormData {
  email: string;
  password: string;
}

export default function SignInPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, user } = useAuth();

  const [formData, setFormData] = useState<SignInFormData>({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect authenticated users to dashboard or admin panel
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (user?.role === 'ADMIN') {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        // Redirect will be handled by useEffect after user state updates
      } else {
        setError(result.error || "Sign in failed. Please try again.");
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth status
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

  // This component should not render if user is authenticated (redirect happens in useEffect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div
        className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-8">
          {/* Logo and Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
              <Image
                src="https://ucarecdn.com/6b43f5cf-10b4-4838-b2ba-397c0a896734/-/format/auto/"
                alt="ReimburseMe Logo"
                className="w-16 h-16"
                width={40}
                height={40}
              />
            </div>
            <h1
              className="text-3xl font-bold text-gray-900 mb-2"
              style={{ fontFamily: "Poppins, system-ui, sans-serif" }}
            >
              ReimburseMe
            </h1>
            <p className="text-gray-600">Welcome back</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="relative">
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  required
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2E86DE] hover:bg-[#2574C7] text-white font-semibold py-3 px-4 rounded-2xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>

            <div className="text-center text-sm text-gray-600">
              Don`&apos`t have an account?{" "}
              <Link
                href="/account/signup"
                className="text-[#2E86DE] hover:text-[#2574C7] font-medium"
              >
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
  );
}
