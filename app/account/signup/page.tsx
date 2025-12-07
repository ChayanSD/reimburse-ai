"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import Image from "next/image";

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
  accept_terms: boolean;
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  confirm_password?: string;
  accept_terms?: string;
  submit?: string;
}

interface PasswordRules {
  length: RegExp;
  uppercase: RegExp;
  lowercase: RegExp;
  number: RegExp;
  symbol: RegExp;
}

export default function SignUpPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
    accept_terms: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [isValidForm, setIsValidForm] = useState(false);

  // Password validation rules
  const passwordRules: PasswordRules = {
    length: /.{8,72}/,
    uppercase: /[A-Z]/,
    lowercase: /[a-z]/,
    number: /[0-9]/,
    symbol: /[!@#$%^&*]/,
  };

  // Validate individual fields
  const validateField = (name: keyof FormData, value: string | boolean, allData: FormData = formData): FormErrors => {
    const newErrors: FormErrors = { ...errors };

    switch (name) {
      case "first_name":
      case "last_name":
        const strValue = value as string;
        if (!strValue.trim()) {
          newErrors[name] = `${name.replace("_", " ")} is required`;
        } else if (!/^[a-zA-Z\s\-']{1,60}$/.test(strValue)) {
          newErrors[name] =
            "Only letters, spaces, hyphens, and apostrophes (1-60 chars)";
        } else {
          delete newErrors[name];
        }
        break;

      case "email":
        const emailValue = value as string;
        if (!emailValue.trim()) {
          newErrors[name] = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
          newErrors[name] = "Please enter a valid email address";
        } else {
          delete newErrors[name];
        }
        break;

      case "password":
        const passwordValue = value as string;
        const failedRules = [];
        if (!passwordRules.length.test(passwordValue))
          failedRules.push("at least 8 characters");
        if (!passwordRules.uppercase.test(passwordValue))
          failedRules.push("1 uppercase letter");
        if (!passwordRules.lowercase.test(passwordValue))
          failedRules.push("1 lowercase letter");
        if (!passwordRules.number.test(passwordValue)) failedRules.push("1 number");
        if (!passwordRules.symbol.test(passwordValue))
          failedRules.push("1 symbol (!@#$%^&*)");

        if (failedRules.length > 0) {
          newErrors[name] = `Password must contain ${failedRules.join(", ")}`;
        } else {
          delete newErrors[name];
        }

        // Also validate confirm password if it exists
        if (allData.confirm_password && passwordValue !== allData.confirm_password) {
          newErrors.confirm_password = "Passwords do not match";
        } else if (
          allData.confirm_password &&
          passwordValue === allData.confirm_password
        ) {
          delete newErrors.confirm_password;
        }
        break;

      case "confirm_password":
        const confirmValue = value as string;
        if (!confirmValue.trim()) {
          newErrors[name] = "Please confirm your password";
        } else if (confirmValue !== allData.password) {
          newErrors[name] = "Passwords do not match";
        } else {
          delete newErrors[name];
        }
        break;

      case "accept_terms":
        const boolValue = value as boolean;
        if (!boolValue) {
          newErrors[name] = "You must accept the terms and privacy policy";
        } else {
          delete newErrors[name];
        }
        break;
    }

    return newErrors;
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const fieldName = name as keyof FormData;
    const newValue = type === "checkbox" ? checked : value;
    const newFormData = { ...formData, [fieldName]: newValue };

    setFormData(newFormData);

    // Real-time validation
    const newErrors = validateField(fieldName, newValue, newFormData);
    setErrors(newErrors);
  };

  // Check if form is valid
  useEffect(() => {
    const hasNoErrors = Object.keys(errors).length === 0;
    const allFieldsFilled = Object.entries(formData).every(([key, value]) => {
      if (key === "accept_terms") return value === true;
      return (value as string).trim() !== "";
    });

    setIsValidForm(hasNoErrors && allFieldsFilled);
  }, [formData, errors]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isValidForm) return;

    setLoading(true);

    try {
      const result = await signup(
        formData.email,
        formData.password,
        formData.first_name,
        formData.last_name
      );

      if (result.success) {
        // Redirect to dashboard after successful signup
        router.push("/dashboard");
      } else {
        setErrors({ submit: result.error || "Signup failed" });
      }
    } catch (error) {
      console.error("Signup error:", error);
      setErrors({ submit: "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
        className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-lg p-8">
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
              Create Account
            </h1>
            <p className="text-gray-600">
              Join ReimburseMe and start managing your expenses
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent transition-colors ${
                    errors.first_name ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="First name"
                  maxLength={60}
                  required
                />
                {errors.first_name && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.first_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent transition-colors ${
                    errors.last_name ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Last name"
                  maxLength={60}
                  required
                />
                {errors.last_name && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.last_name}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent transition-colors ${
                  errors.email ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="your@email.com"
                required
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent transition-colors ${
                  errors.password ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Create a strong password"
                maxLength={72}
                required
              />

              {/* Password Rules */}
              <div className="mt-3 p-4 bg-gray-50 rounded-2xl">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Password must contain:
                </p>
                <ul className="text-sm space-y-1">
                  <li
                    className={`flex items-center ${passwordRules.length.test(formData.password) ? "text-green-600" : "text-gray-500"}`}
                  >
                    <span className="mr-2 text-lg">
                      {passwordRules.length.test(formData.password) ? "✓" : "○"}
                    </span>
                    At least 8 characters
                  </li>
                  <li
                    className={`flex items-center ${passwordRules.uppercase.test(formData.password) ? "text-green-600" : "text-gray-500"}`}
                  >
                    <span className="mr-2 text-lg">
                      {passwordRules.uppercase.test(formData.password)
                        ? "✓"
                        : "○"}
                    </span>
                    1 uppercase letter
                  </li>
                  <li
                    className={`flex items-center ${passwordRules.lowercase.test(formData.password) ? "text-green-600" : "text-gray-500"}`}
                  >
                    <span className="mr-2 text-lg">
                      {passwordRules.lowercase.test(formData.password)
                        ? "✓"
                        : "○"}
                    </span>
                    1 lowercase letter
                  </li>
                  <li
                    className={`flex items-center ${passwordRules.number.test(formData.password) ? "text-green-600" : "text-gray-500"}`}
                  >
                    <span className="mr-2 text-lg">
                      {passwordRules.number.test(formData.password) ? "✓" : "○"}
                    </span>
                    1 number
                  </li>
                  <li
                    className={`flex items-center ${passwordRules.symbol.test(formData.password) ? "text-green-600" : "text-gray-500"}`}
                  >
                    <span className="mr-2 text-lg">
                      {passwordRules.symbol.test(formData.password) ? "✓" : "○"}
                    </span>
                    1 symbol (!@#$%^&*)
                  </li>
                </ul>
              </div>

              {errors.password && (
                <p className="text-red-500 text-sm mt-2">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:border-transparent transition-colors ${
                  errors.confirm_password ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Confirm your password"
                maxLength={72}
                required
              />
              {errors.confirm_password && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.confirm_password}
                </p>
              )}
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start">
              <input
                type="checkbox"
                name="accept_terms"
                checked={formData.accept_terms}
                onChange={handleChange}
                className="mt-1 h-4 w-4 text-[#2E86DE] focus:ring-[#2E86DE] border-gray-300 rounded"
              />
              <label className="ml-3 text-sm text-gray-600">
                By continuing, you agree to the{" "}
                <Link href="/terms" className="text-[#2E86DE] hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-[#2E86DE] hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>
            {errors.accept_terms && (
              <p className="text-red-500 text-sm">{errors.accept_terms}</p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isValidForm || loading}
              className={`w-full py-3 px-4 rounded-2xl font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#2E86DE] focus:ring-offset-2 ${
                isValidForm && !loading
                  ? "bg-[#2E86DE] hover:bg-[#2574C7]"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              {loading ? "Creating Account..." : "Continue"}
            </button>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-600 text-center">
                {errors.submit}
              </div>
            )}
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/account/signin"
              className="text-[#2E86DE] hover:text-[#2574C7] font-medium"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
  );
}
