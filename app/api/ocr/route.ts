import { NextRequest, NextResponse } from "next/server";
import { ocrRequestSchema } from "@/validation/ocr.validation";
import {
  handleDatabaseError,
  handleValidationError,
  badRequest,
  unauthorized,
} from "@/lib/error";
import { RATE_LIMITS, limitByUser } from "@/lib/rateLimit";
import { sanitizeUrl, sanitizeText } from "@/lib/sanitize";

import { getSession } from "@/lib/session";
import {
  aiOCRExtraction,
  checkForDuplicate,
  normalizeCurrency,
  normalizeMerchant,
  parseDateRobust,
} from "@/lib/ocrProcessing";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const userId = session.id;
    const body = await request.json();

    // Rate limiting
    const rateLimit = await limitByUser(
      userId,
      "ocr:process",
      RATE_LIMITS.OCR_PROCESS.windowMs,
      RATE_LIMITS.OCR_PROCESS.max
    );
    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded", reset: rateLimit.reset },
        { status: 429 }
      );
    }

    // Validate input
    const validation = ocrRequestSchema.safeParse(body);
    if (!validation.success) return handleValidationError(validation.error);

    const { file_url, filename } = validation.data;

    // Sanitize inputs
    const sanitizedFileUrl = sanitizeUrl(file_url);
    const sanitizedFilename = sanitizeText(filename || "");
    if (!sanitizedFileUrl) return badRequest("Invalid file URL provided");

    // Extract data
    const extractedData = await aiOCRExtraction(sanitizedFileUrl, sanitizedFilename);

    // Process and normalize
    const merchant = normalizeMerchant(extractedData.merchant_name);
    const currency = normalizeCurrency(extractedData.amount, "USD");
    const date = parseDateRobust(extractedData.receipt_date) || extractedData.receipt_date;

    // Check duplicates
    const isDuplicate = await checkForDuplicate(userId, merchant, currency.amount, date);

    // Calculate confidence
    const confidence = extractedData.confidence === "high" ? 0.9 :
                      extractedData.confidence === "medium" ? 0.7 : 0.5;

    return NextResponse.json({
      success: true,
      extracted_data: {
        merchant_name: merchant,
        amount: currency.amount,
        currency: currency.currency,
        receipt_date: date,
        category: extractedData.category,
        confidence,
        needs_review: confidence < 0.72,
        is_duplicate: isDuplicate,
        extraction_notes: extractedData.extraction_notes || "Processed successfully"
      },
    });
  } catch (error) {
    console.error("POST /api/ocr error:", error);
    return handleDatabaseError(error as Error);
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ message: "Hello World" });
}