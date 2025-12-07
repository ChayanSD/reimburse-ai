"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface NavLink {
  name: string;
  href: string;
}

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className }) => {
  const navigationLinks: NavLink[] = [
    { name: "Home", href: "/" },
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Upload", href: "/upload" },
    { name: "Support", href: "mailto:support@reimburseme.com" },
  ];

  const legalLinks: NavLink[] = [
    { name: "Terms", href: "/terms" },
    { name: "Privacy", href: "/privacy" },
    { name: "Cookies", href: "/cookies" },
  ];

  return (
    <footer
        className={`bg-[#F3F4F6] border-t border-gray-200 py-16 px-6 ${className || ''}`}
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Logo and Brand - Centered */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center space-x-3 mb-12">
              <Image
                src="https://ucarecdn.com/6b43f5cf-10b4-4838-b2ba-397c0a896734/-/format/auto/"
                alt="ReimburseMe Logo"
                className="w-10 h-10"
                width={40}
                height={40}
              />
              <span
                className="text-gray-900 text-[18px] font-bold"
                style={{ fontFamily: "Poppins, system-ui, sans-serif" }}
              >
                ReimburseMe
              </span>
            </div>

            {/* Navigation Links */}
            <nav>
              <div className="flex flex-wrap items-center justify-center gap-10">
                {navigationLinks.map((link) => {
                  const isExternal = link.href.startsWith('mailto:') || link.href.startsWith('tel:') || link.href.startsWith('http');
                  const isHash = link.href.startsWith('#');
                  
                  if (isExternal || isHash) {
                    return (
                      <Link
                        key={link.name}
                        href={link.href}
                        className="text-gray-700 hover:text-gray-900 text-[16px] font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:ring-offset-2 focus:ring-inset rounded-sm px-2 py-1"
                        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                      >
                        {link.name}
                      </Link>
                    );
                  }
                  
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      className="text-gray-700 hover:text-gray-900 text-[16px] font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:ring-offset-2 focus:ring-inset rounded-sm px-2 py-1"
                      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Bottom row - Copyright and Legal Links */}
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 pt-8 border-t border-gray-300">
            {/* Copyright */}
            <div
              className="text-gray-600 text-[14px] font-normal order-2 md:order-1"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              © {new Date().getFullYear()} ReimburseMe. All rights reserved.
            </div>

            {/* Legal Links */}
            <div className="flex items-center order-1 md:order-2">
              {legalLinks.map((link, index) => (
                <div key={link.name} className="flex items-center">
                  <Link
                    href={link.href}
                    className="text-gray-600 hover:text-gray-900 text-[14px] font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:ring-offset-2 focus:ring-inset rounded-sm px-2 py-1"
                    style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                  >
                    {link.name}
                  </Link>
                  {index < legalLinks.length - 1 && (
                    <span className="text-gray-600 text-[14px] mx-6">|</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>
  );
};

export default Footer;