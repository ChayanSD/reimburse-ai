import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <>
      <div
        className="min-h-screen bg-white"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <Header />
        <main className="max-w-4xl mx-auto px-6 py-16">
          <div className="prose prose-gray max-w-none">
            <h1
              className="text-4xl font-bold text-gray-900 mb-8"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Privacy Policy
            </h1>

            <p className="text-lg text-gray-600 mb-8">
              Last updated: October 28, 2025
            </p>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                1. Information We Collect
              </h2>
              <p className="text-gray-700 mb-4">
                When you use ReimburseMe, we collect information you provide
                directly to us, such as:
              </p>
              <ul className="list-disc ml-6 mb-4 text-gray-700">
                <li>Account information (name, email address, password)</li>
                <li>Receipt images and expense documentation</li>
                <li>Payment information for subscription services</li>
                <li>Communication data when you contact our support</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                2. How We Use Your Information
              </h2>
              <p className="text-gray-700 mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc ml-6 mb-4 text-gray-700">
                <li>Provide, maintain, and improve our services</li>
                <li>Process OCR data extraction from your receipts</li>
                <li>Generate expense reports and facilitate reimbursements</li>
                <li>Process subscription payments and manage your account</li>
                <li>Respond to your comments and questions</li>
                <li>Send you technical notices and support messages</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                3. Data Security
              </h2>
              <p className="text-gray-700 mb-4">
                We implement appropriate security measures to protect your
                personal information:
              </p>
              <ul className="list-disc ml-6 mb-4 text-gray-700">
                <li>All data is encrypted both in transit and at rest</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and authentication requirements</li>
                <li>Secure cloud infrastructure with automatic backups</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                4. Information Sharing
              </h2>
              <p className="text-gray-700 mb-4">
                We do not sell, trade, or otherwise transfer your personal
                information to third parties, except:
              </p>
              <ul className="list-disc ml-6 mb-4 text-gray-700">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights, property, or safety</li>
                <li>
                  With trusted service providers who assist in our operations
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                5. Data Retention
              </h2>
              <p className="text-gray-700 mb-4">
                We retain your personal information for as long as necessary to
                provide our services and comply with legal obligations. You may
                request deletion of your account and associated data at any
                time.
              </p>
            </section>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                6. Your Rights
              </h2>
              <p className="text-gray-700 mb-4">You have the right to:</p>
              <ul className="list-disc ml-6 mb-4 text-gray-700">
                <li>Access your personal information</li>
                <li>Correct inaccurate or incomplete data</li>
                <li>Delete your account and personal information</li>
                <li>Export your data in a portable format</li>
                <li>Opt-out of marketing communications</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                7. Cookies and Tracking
              </h2>
              <p className="text-gray-700 mb-4">
                We use cookies and similar technologies to enhance your
                experience, analyze usage patterns, and improve our services.
                You can control cookie preferences through your browser
                settings.
              </p>
            </section>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                8. Contact Us
              </h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about this Privacy Policy or our data
                practices, please contact us at:
              </p>
              <p className="text-gray-700">
                Email:{" "}
                <Link
                  href="mailto:privacy@reimburseme.com"
                  className="text-[#2E86DE] hover:text-[#2574C7]"
                >
                  privacy@reimburseme.com
                </Link>
                <br />
                Support:{" "}
                <Link
                  href="mailto:support@reimburseme.com"
                  className="text-[#2E86DE] hover:text-[#2574C7]"
                >
                  support@reimburseme.com
                </Link>
              </p>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
