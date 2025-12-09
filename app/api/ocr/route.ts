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
    console.log("OCR API: Starting request processing");

    const session = await getSession();
    console.log("OCR API: Session retrieved", { hasSession: !!session });

    if (!session) {
      console.log("OCR API: No session found, returning unauthorized");
      return unauthorized();
    }

    const userId = session.id;
    console.log("OCR API: User ID", userId);

    const body = await request.json();
    console.log("OCR API: Request body parsed", { hasBody: !!body });

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

    // Validate input with Zod
    console.log("OCR API: Validating request body");
    const validation = ocrRequestSchema.safeParse(body);
    console.log("OCR API: Validation result", { success: validation.success });
    if (!validation.success) {
      console.log("OCR API: Validation failed", validation.error);
      return handleValidationError(validation.error);
    }

    const { file_url, filename } = validation.data;
    console.log("OCR API: Extracted data", { file_url: file_url.substring(0, 50) + "...", filename });

    // Sanitize inputs
    console.log("OCR API: Sanitizing inputs");
    const sanitizedFileUrl = sanitizeUrl(file_url);
    const sanitizedFilename = sanitizeText(filename || "");
    console.log("OCR API: Sanitized inputs", { sanitizedFileUrl: sanitizedFileUrl ? sanitizedFileUrl.substring(0, 50) + "..." : null, sanitizedFilename });

    if (!sanitizedFileUrl) {
      console.log("OCR API: Invalid file URL, returning bad request");
      return badRequest("Invalid file URL provided");
    }

    // Use AI-powered extraction
    const extractedData = await aiOCRExtraction(
      sanitizedFileUrl,
      sanitizedFilename
    );

    // Enhanced post-processing
    const normalizedMerchant = normalizeMerchant(extractedData.merchant_name);
    const currencyData = normalizeCurrency(extractedData.amount, "USD");
    const normalizedDate =
      parseDateRobust(extractedData.receipt_date) || extractedData.receipt_date;

    // Check for duplicates
    console.log("OCR API: Checking for duplicates");
    const isDuplicate = await checkForDuplicate(
      userId,
      normalizedMerchant,
      currencyData.amount,
      normalizedDate
    );
    console.log("OCR API: Duplicate check result", { isDuplicate });

    // Determine confidence and review flags
    console.log("OCR API: Calculating confidence and review flags");
    const confidence =
      extractedData.confidence === "high"
        ? 0.9
        : extractedData.confidence === "medium"
        ? 0.7
        : 0.5;
    const needsReview = confidence < 0.72;
    console.log("OCR API: Confidence calculation", { confidence, needsReview });

    const processedData = {
      merchant_name: normalizedMerchant,
      amount: currencyData.amount,
      currency: currencyData.currency,
      receipt_date: normalizedDate,
      category: extractedData.category,
      confidence: confidence,
      needs_review: needsReview,
      is_duplicate: isDuplicate,
      date_iso: normalizedDate,
      extraction_notes:
        "extraction_notes" in extractedData
          ? extractedData.extraction_notes
          : "Processed with enhanced normalization",
      original_data: {
        merchant: extractedData.merchant_name,
        amount: extractedData.amount,
        date: extractedData.receipt_date,
        confidence: extractedData.confidence,
      },
    };

    return NextResponse.json({
      success: true,
      extracted_data: processedData,
    });
  } catch (error) {
    console.error("POST /api/ocr error:", error);
    return handleDatabaseError(error as Error);
  }
}
