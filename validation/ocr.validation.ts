import { z } from "zod";

export const ocrRequestSchema = z.object({
  file_url: z.url("File URL must be a valid URL"),
  filename: z.string().optional(),
});