"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const menuItems = [
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "How It Works", href: "#how-it-works" },
  ];

  return (
    <>
      <header
        className="bg-white border-b border-gray-100 h-16 md:h-16 px-6"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <div className="max-w-[1200px] mx-auto flex items-center justify-between h-full">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Image
              src="https://ucarecdn.com/6b43f5cf-10b4-4838-b2ba-397c0a896734/-/format/auto/"
              alt="ReimburseMe Logo"
              className="w-10 h-10"
              width={40}
              height={40}
            />
            <span
              className="text-gray-900 font-bold text-xl"
              style={{ fontFamily: "Poppins, system-ui, sans-serif" }}
            >
              ReimburseMe
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-600 hover:text-[#2E86DE] transition-colors duration-150 font-medium text-base"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="px-6 py-2 bg-[#2E86DE] hover:bg-[#2574C7] text-white font-semibold rounded-2xl transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="px-6 py-2 text-gray-700 hover:text-[#2E86DE] font-medium transition-colors"
                >
                  Profile
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/account/signin"
                  className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/account/signup"
                  className="px-6 py-2 bg-[#2E86DE] hover:bg-[#2574C7] text-white font-semibold rounded-2xl transition-colors"
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-700"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Panel */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 bg-white z-50 flex flex-col">
            <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <Image
                  src="https://ucarecdn.com/6b43f5cf-10b4-4838-b2ba-397c0a896734/-/format/auto/"
                  alt="ReimburseMe Logo"
                  className="w-10 h-10"
                  width={40}
                  height={40}
                />
                <span
                  className="text-gray-900 font-bold text-xl"
                  style={{ fontFamily: "Poppins, system-ui, sans-serif" }}
                >
                  ReimburseMe
                </span>
              </div>
              <button
                className="p-2 text-gray-700"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close mobile menu"
              >
                <X size={24} />
              </button>
            </div>

            <nav className="flex-1 px-6 py-6 space-y-4">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block py-3 text-gray-600 hover:text-[#2E86DE] font-medium text-lg border-b border-gray-100 last:border-b-0"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="px-6 py-6 space-y-3 border-t border-gray-100">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    className="block w-full text-center px-6 py-3 bg-[#2E86DE] hover:bg-[#2574C7] text-white font-semibold rounded-2xl transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    className="block w-full text-center px-6 py-3 text-gray-700 font-medium border border-gray-300 rounded-2xl hover:bg-gray-50 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/account/signin"
                    className="block w-full text-center px-6 py-3 text-gray-700 font-medium border border-gray-300 rounded-2xl hover:bg-gray-50 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/account/signup"
                    className="block w-full text-center px-6 py-3 bg-[#2E86DE] hover:bg-[#2574C7] text-white font-semibold rounded-2xl transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Start Free Trial
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
