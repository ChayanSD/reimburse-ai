import { z } from "zod";

export const RECEIPT_CATEGORIES = ["Meals", "Travel", "Supplies", "Other"] as const;

export const receiptCreateSchema = z.object({
  file_url: z.url("File URL must be a valid URL"),
  merchant_name: z.string().min(1, "Merchant name is required").max(255, "Merchant name too long"),
  receipt_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  amount: z.number().positive("Amount must be positive"),
  category: z.enum(RECEIPT_CATEGORIES, { message: `Category must be one of: ${RECEIPT_CATEGORIES.join(", ")}` }),
  note: z.string().optional(),
  currency: z.string().default("USD"),
});

export const receiptUpdateSchema = z.object({
  merchant_name: z.string().min(1, "Merchant name is required").max(255, "Merchant name too long").optional(),
  receipt_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
  amount: z.number().positive("Amount must be positive").optional(),
  category: z.enum(RECEIPT_CATEGORIES, { message: `Category must be one of: ${RECEIPT_CATEGORIES.join(", ")}` }).optional(),
  note: z.string().optional(),
  currency: z.string().optional(),
});