import { z } from "zod";

// Zod validation schema for company settings
export const companySettingsSchema = z.object({
  setting_name: z.string().min(1, "Setting name is required"),
  company_name: z.string().min(1, "Company name is required"),
  approver_name: z.string().min(1, "Approver name is required"),
  approver_email: z.string().email("Invalid email format").min(1, "Approver email is required"),
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().default("United States"),
  department: z.string().optional(),
  cost_center: z.string().optional(),
  notes: z.string().optional(),
  is_default: z.boolean().default(false),
});

// Type inference from schema
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;

// For setting default functionality
export const setDefaultSchema = z.object({
  id: z.number(),
  ...companySettingsSchema.partial().shape,
});

// For partial updates
export const updateCompanySettingsSchema = companySettingsSchema.partial();

// Email validation helper
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};