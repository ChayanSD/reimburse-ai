"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import Image from "next/image";

export default function LogoutPage() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div
        className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-8 text-center">
          {/* Logo and Brand */}
          <div className="mb-8">
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
              Sign Out
            </h1>
            <p className="text-gray-600">Are you sure you want to sign out?</p>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full bg-[#2E86DE] hover:bg-[#2574C7] text-white font-semibold py-3 px-4 rounded-2xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:ring-offset-2 mb-4"
          >
            Sign Out
          </button>

          <Link
            href="/dashboard"
            className="block w-full text-center text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancel
          </Link>
        </div>
      </div>
  );
}
