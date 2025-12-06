"use client";

import  { useState } from "react";
import { Timer, Smartphone, FileText, Shield, LucideIcon } from "lucide-react";

interface Feature {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  isActive?: boolean;
}

export default function Features() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const features: Feature[] = [
    {
      id: "save-time",
      icon: Timer,
      title: "Save time",
      description:
        "No more manual data entry. Upload receipts and let AI extract all the details automatically.",
    },
    {
      id: "mobile-friendly",
      icon: Smartphone,
      title: "Mobile-first design",
      description:
        "Take photos of receipts on the go. Upload from anywhere using your phone or computer.",
      isActive: true,
    },
    {
      id: "professional-reports",
      icon: FileText,
      title: "Professional reports",
      description:
        "Generate clean PDF and CSV reports that accountants and HR departments love.",
    },
    {
      id: "secure-storage",
      icon: Shield,
      title: "Secure & compliant",
      description:
        "Your receipts are encrypted and stored securely with automatic backups and compliance.",
    },
  ];

  const isCardActive = (feature: Feature): boolean => {
    return feature.isActive || hoveredCard === feature.id;
  };

  return (
    <section className="py-16 md:py-24 px-6 bg-white" id="features">
        <div className="max-w-[1200px] mx-auto">
          {/* Section heading */}
          <div className="text-center mb-12 md:mb-16">
            <h2
              className="text-4xl md:text-[48px] leading-tight md:leading-[1.1] text-gray-900 mb-6"
              style={{
                fontFamily: "Poppins, serif",
                fontWeight: "700",
              }}
            >
              Faster, smarter,{" "}
              <em className="font-bold text-[#2E86DE]">better</em> expense
              management
            </h2>

            <p
              className="text-base md:text-lg text-gray-600 max-w-[60ch] mx-auto"
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Stop losing receipts and spending hours on expense reports.
              ReimburseMe automates the entire process.
            </p>
          </div>

          {/* Feature cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-7">
            {features.map((feature) => {
              const IconComponent = feature.icon;
              const active = isCardActive(feature);

              return (
                <div
                  key={feature.id}
                  role="button"
                  tabIndex={0}
                  className={`
                    relative p-6 md:p-8 rounded-3xl border transition-all duration-200 ease-out cursor-pointer
                    focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:ring-opacity-50
                    ${
                      active
                        ? "bg-gray-900 border-transparent"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }
                  `}
                  onMouseEnter={() => setHoveredCard(feature.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  {/* Icon container */}
                  <div
                    className={`
                      w-12 h-12 rounded-2xl border flex items-center justify-center mb-4 transition-all duration-200 ease-out
                      ${
                        active
                          ? "bg-gray-900 border-transparent"
                          : "bg-white border-gray-200"
                      }
                    `}
                  >
                    <IconComponent
                      size={24}
                      strokeWidth={1.5}
                      className={`transition-all duration-200 ease-out ${
                        active ? "text-white opacity-80" : "text-gray-900"
                      }`}
                    />
                  </div>

                  {/* Title */}
                  <h3
                    className={`
                      text-xl mb-2 transition-all duration-200 ease-out
                      ${active ? "text-white" : "text-gray-900"}
                    `}
                    style={{
                      fontFamily: "Poppins, system-ui, sans-serif",
                      fontWeight: "600",
                    }}
                  >
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p
                    className={`
                      text-base leading-relaxed transition-all duration-200 ease-out
                      ${active ? "text-gray-300" : "text-gray-600"}
                    `}
                    style={{
                      fontFamily: "Inter, system-ui, sans-serif",
                      fontWeight: "400",
                      maxWidth: "55ch",
                    }}
                  >
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
  );
}
