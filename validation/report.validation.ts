import { z } from "zod";

export const reportCreateSchema = z.object({
  receipt_ids: z.array(z.number().int().positive()).min(1, "At least one receipt must be selected"),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
  title: z.string().optional(),
  include_items: z.boolean().default(true),
  format: z.enum(["pdf", "csv"]).default("pdf"),
  company_setting_id: z.number().int().positive().nullable().optional(),
}).refine((data) => {
  const start = new Date(data.period_start);
  const end = new Date(data.period_end);
  return start <= end;
}, {
  message: "Start date must be before or equal to end date",
  path: ["period_end"],
});
