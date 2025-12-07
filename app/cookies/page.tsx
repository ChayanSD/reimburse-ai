import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Link from "next/link";

export default function CookiesPage() {
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
              Cookie Policy
            </h1>

            <p className="text-lg text-gray-600 mb-8">
              Last updated: October 28, 2025
            </p>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                1. What Are Cookies
              </h2>
              <p className="text-gray-700 mb-4">
                Cookies are small text files that are placed on your device when
                you visit our website. They help us provide you with a better
                experience by remembering your preferences and improving our
                services.
              </p>
            </section>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                2. Types of Cookies We Use
              </h2>

              <div className="mb-6">
                <h3
                  className="text-xl font-semibold text-gray-900 mb-2"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Essential Cookies
                </h3>
                <p className="text-gray-700 mb-4">
                  These cookies are necessary for the website to function
                  properly. They enable core functionality such as:
                </p>
                <ul className="list-disc ml-6 mb-4 text-gray-700">
                  <li>User authentication and login sessions</li>
                  <li>Security and fraud prevention</li>
                  <li>Loading balancing and performance</li>
                  <li>Storing your preferences and settings</li>
                </ul>
              </div>

              <div className="mb-6">
                <h3
                  className="text-xl font-semibold text-gray-900 mb-2"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Analytics Cookies
                </h3>
                <p className="text-gray-700 mb-4">
                  These cookies help us understand how visitors interact with
                  our website by collecting and reporting information
                  anonymously:
                </p>
                <ul className="list-disc ml-6 mb-4 text-gray-700">
                  <li>Page views and navigation patterns</li>
                  <li>Time spent on different pages</li>
                  <li>Click tracking and user behavior</li>
                  <li>Error reports and performance metrics</li>
                </ul>
              </div>

              <div className="mb-6">
                <h3
                  className="text-xl font-semibold text-gray-900 mb-2"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Functional Cookies
                </h3>
                <p className="text-gray-700 mb-4">
                  These cookies enhance functionality and personalization:
                </p>
                <ul className="list-disc ml-6 mb-4 text-gray-700">
                  <li>Remembering your language and region preferences</li>
                  <li>Storing your dashboard layout preferences</li>
                  <li>Maintaining your expense report filters</li>
                  <li>Keeping track of your recent uploads</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                3. Managing Your Cookie Preferences
              </h2>
              <p className="text-gray-700 mb-4">
                You can control and manage cookies in several ways:
              </p>

              <div className="mb-6">
                <h3
                  className="text-xl font-semibold text-gray-900 mb-2"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Browser Settings
                </h3>
                <p className="text-gray-700 mb-4">
                  Most web browsers allow you to control cookies through their
                  settings. You can:
                </p>
                <ul className="list-disc ml-6 mb-4 text-gray-700">
                  <li>Block all cookies</li>
                  <li>Accept only first-party cookies</li>
                  <li>Delete cookies when you close the browser</li>
                  <li>Set specific rules for different websites</li>
                </ul>
              </div>

              <div className="mb-6">
                <h3
                  className="text-xl font-semibold text-gray-900 mb-2"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Browser-Specific Instructions
                </h3>
                <ul className="list-disc ml-6 mb-4 text-gray-700">
                  <li>
                    <strong>Chrome:</strong> Settings → Privacy and Security →
                    Cookies
                  </li>
                  <li>
                    <strong>Firefox:</strong> Options → Privacy & Security →
                    Cookies
                  </li>
                  <li>
                    <strong>Safari:</strong> Preferences → Privacy → Cookies
                  </li>
                  <li>
                    <strong>Edge:</strong> Settings → Cookies and Site
                    Permissions
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                4. Third-Party Cookies
              </h2>
              <p className="text-gray-700 mb-4">
                We may use services from trusted third parties that place
                cookies on your device:
              </p>
              <ul className="list-disc ml-6 mb-4 text-gray-700">
                <li>
                  <strong>Payment Processors:</strong> For secure payment
                  handling
                </li>
                <li>
                  <strong>Analytics Services:</strong> To understand website
                  usage
                </li>
                <li>
                  <strong>Support Tools:</strong> For customer service
                  functionality
                </li>
                <li>
                  <strong>CDN Services:</strong> To deliver content efficiently
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                5. Cookie Retention
              </h2>
              <p className="text-gray-700 mb-4">
                Different types of cookies are stored for different periods:
              </p>
              <ul className="list-disc ml-6 mb-4 text-gray-700">
                <li>
                  <strong>Session cookies:</strong> Deleted when you close your
                  browser
                </li>
                <li>
                  <strong>Persistent cookies:</strong> Remain until they expire
                  or you delete them
                </li>
                <li>
                  <strong>Authentication cookies:</strong> Last for your login
                  session
                </li>
                <li>
                  <strong>Preference cookies:</strong> Last for up to 1 year
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                6. Impact of Disabling Cookies
              </h2>
              <p className="text-gray-700 mb-4">
                If you choose to disable cookies, some features of ReimburseMe
                may not function properly:
              </p>
              <ul className="list-disc ml-6 mb-4 text-gray-700">
                <li>You may need to re-enter information repeatedly</li>
                <li>Your preferences and settings won&apos;t be saved</li>
                <li>Some pages may not display correctly</li>
                <li>Login functionality may be affected</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                7. Updates to This Policy
              </h2>
              <p className="text-gray-700 mb-4">
                We may update this Cookie Policy from time to time. We will
                notify you of any significant changes by posting the new policy
                on this page and updating the &quot;Last updated&quot; date.
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
                If you have any questions about our use of cookies, please
                contact us at:
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
