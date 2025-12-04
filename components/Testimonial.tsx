import { Star } from "lucide-react";
import Image from "next/image";

export default function Testimonial() {
  return (
    <>
      <section className="py-16 md:py-24 px-6 bg-white">
        <div className="max-w-[1120px] mx-auto">
          <div className="rounded-[20px] md:rounded-[28px] p-8 md:p-14 bg-[#F3F4F6]">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-16">
              {/* Mobile: Portrait first, Desktop: Text content (3/5 width) */}
              <div className="order-2 md:order-1 md:col-span-3">
                {/* Star Rating */}
                <div
                  className="flex items-center gap-1 mb-6 md:mb-8"
                  role="img"
                  aria-label="5 out of 5 star rating"
                >
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={18}
                      className="fill-[#2E86DE] text-[#2E86DE]"
                    />
                  ))}
                </div>

                {/* Testimonial Quote */}
                <blockquote
                  className="text-[28px] md:text-[40px] leading-[1.2] text-gray-900 mb-6 md:mb-10"
                  style={{
                    fontFamily: "Poppins, serif",
                    fontWeight: 500,
                  }}
                >
                  `&quot;`ReimburseMe saved me hours every month. No more
                  digging`&quot;` through receipts or manual spreadsheets. The
                  OCR is incredibly`&quot;` accurate and the reports look
                  professional.&quot;`
                </blockquote>

                {/* Author Block */}
                <div className="space-y-1">
                  <div
                    className="text-[16px] text-gray-900 font-semibold"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Sarah Chen
                  </div>
                  <div
                    className="text-[14px] text-gray-600"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Marketing Director, TechFlow
                  </div>
                </div>
              </div>

              {/* Mobile: Portrait second, Desktop: Portrait (2/5 width) */}
              <div className="order-1 md:order-2 md:col-span-2">
                <div className="aspect-square overflow-hidden rounded-[20px] md:rounded-[28px]">
                  <Image
                    src="https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=800"
                    alt="Portrait of Sarah Chen, Marketing Director at TechFlow"
                    className="w-full h-full object-cover"
                    style={{
                      filter:
                        "sepia(10%) saturate(110%) hue-rotate(5deg) brightness(105%)",
                    }}
                    width={400}
                    height={400}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
