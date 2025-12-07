import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Link from "next/link";

export default function TermsPage() {
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
              Terms of Service
            </h1>

            <p className="text-lg text-gray-600 mb-8">
              Last updated: October 28, 2025
            </p>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-700 mb-4">
                By accessing and using ReimburseMe (&quot;the Service&quot;),
                you accept and agree to be bound by the terms and provision of
                this agreement.
              </p>
            </section>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                2. Use License
              </h2>
              <p className="text-gray-700 mb-4">
                Permission is granted to temporarily use the Service for
                personal, non-commercial transitory viewing only. This includes:
              </p>
              <ul className="list-disc ml-6 mb-4 text-gray-700">
                <li>Uploading receipts and expense documentation</li>
                <li>Generating expense reports for business reimbursement</li>
                <li>Using OCR and AI features for data extraction</li>
                <li>Exporting data in provided formats</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                3. Privacy and Data
              </h2>
              <p className="text-gray-700 mb-4">
                We take your privacy seriously. All uploaded receipts and
                personal information are encrypted and stored securely. We do
                not share your data with third parties except as necessary to
                provide the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                4. Subscription and Billing
              </h2>
              <p className="text-gray-700 mb-4">
                ReimburseMe offers both free and paid subscription tiers. Paid
                subscriptions are billed monthly or annually as selected. You
                may cancel your subscription at any time.
              </p>
            </section>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                5. Disclaimer
              </h2>
              <p className="text-gray-700 mb-4">
                The information on this service is provided on an &quot;as
                is&quot; basis. To the fullest extent permitted by law,
                ReimburseMe excludes all representations, warranties, conditions
                and terms.
              </p>
            </section>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                6. Limitations
              </h2>
              <p className="text-gray-700 mb-4">
                In no event shall ReimburseMe or its suppliers be liable for any
                damages (including, without limitation, damages for loss of data
                or profit, or due to business interruption) arising out of the
                use or inability to use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                7. Contact Information
              </h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms of Service, please
                contact us at:
              </p>
              <p className="text-gray-700">
                Email:{" "}
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
