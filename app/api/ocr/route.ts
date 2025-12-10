// import { NextRequest, NextResponse } from "next/server";
// import { ocrRequestSchema } from "@/validation/ocr.validation";
// import {
//   handleDatabaseError,
//   handleValidationError,
//   badRequest,
//   unauthorized,
// } from "@/lib/error";
// // import { RATE_LIMITS, limitByUser } from "@/lib/rateLimit";
// import { sanitizeUrl, sanitizeText } from "@/lib/sanitize";

// import { getSession } from "@/lib/session";
// import {
//   aiOCRExtraction,
//   checkForDuplicate,
//   normalizeCurrency,
//   normalizeMerchant,
//   parseDateRobust,
// } from "@/lib/ocrProcessing";

// export const runtime = "nodejs";

// export async function POST(request: NextRequest): Promise<NextResponse> {
//   try {
//     const session = await getSession();
//     if (!session) return unauthorized();

//     const userId = session.id;
//     const body = await request.json();

//     // Rate limiting
//     // const rateLimit = await limitByUser(
//     //   userId,
//     //   "ocr:process",
//     //   RATE_LIMITS.OCR_PROCESS.windowMs,
//     //   RATE_LIMITS.OCR_PROCESS.max
//     // );
//     // if (!rateLimit.ok) {
//     //   return NextResponse.json(
//     //     { error: "Rate limit exceeded", reset: rateLimit.reset },
//     //     { status: 429 }
//     //   );
//     // }

//     // Validate input
//     const validation = ocrRequestSchema.safeParse(body);
//     if (!validation.success) return handleValidationError(validation.error);

//     const { file_url, filename } = validation.data;

//     // Sanitize inputs
//     const sanitizedFileUrl = sanitizeUrl(file_url);
//     const sanitizedFilename = sanitizeText(filename || "");
//     if (!sanitizedFileUrl) return badRequest("Invalid file URL provided");

//     // Extract data
//     const extractedData = await aiOCRExtraction(sanitizedFileUrl, sanitizedFilename);

//     // Process and normalize
//     const merchant = normalizeMerchant(extractedData.merchant_name);
//     const currency = normalizeCurrency(extractedData.amount, "USD");
//     const date = parseDateRobust(extractedData.receipt_date) || extractedData.receipt_date;

//     // Check duplicates
//     const isDuplicate = await checkForDuplicate(userId, merchant, currency.amount, date);

//     // Calculate confidence
//     const confidence = extractedData.confidence === "high" ? 0.9 :
//                       extractedData.confidence === "medium" ? 0.7 : 0.5;

//     return NextResponse.json({
//       success: true,
//       extracted_data: {
//         merchant_name: merchant,
//         amount: currency.amount,
//         currency: currency.currency,
//         receipt_date: date,
//         category: extractedData.category,
//         confidence,
//         needs_review: confidence < 0.72,
//         is_duplicate: isDuplicate,
//         extraction_notes: extractedData.extraction_notes || "Processed successfully"
//       },
//     });
//   } catch (error) {
//     console.error("POST /api/ocr error:", error);
//     return handleDatabaseError(error as Error);
//   }
// }

// export async function GET(): Promise<NextResponse> {
//   return NextResponse.json({ message: "Hello World" });
// }

import { NextRequest, NextResponse } from "next/server";
import { Client } from "@upstash/qstash";
import { ocrRequestSchema } from "@/validation/ocr.validation";
import { handleValidationError, badRequest, unauthorized } from "@/lib/error";
import { sanitizeUrl, sanitizeText } from "@/lib/sanitize";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";
export const maxDuration = 10; // Vercel serverless function timeout

const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN!,
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const userId = session.id;
    const body = await request.json();

    // Validate input
    const validation = ocrRequestSchema.safeParse(body);
    if (!validation.success) return handleValidationError(validation.error);

    const { file_url, filename } = validation.data;

    // Sanitize inputs
    const sanitizedFileUrl = sanitizeUrl(file_url);
    const sanitizedFilename = sanitizeText(filename || "");
    if (!sanitizedFileUrl) return badRequest("Invalid file URL provided");

    // Check cache for existing OCR result
    const cacheKey = `ocr:${userId}:${sanitizedFileUrl}`;
    const cachedResult = await redis.get(cacheKey);

    if (cachedResult) {
      console.log("Using cached OCR result for:", sanitizedFileUrl);
      const parsedCache = JSON.parse(cachedResult as string);

      // Create receipt record with cached data
      const receipt = await prisma.receipt.create({
        data: {
          userId,
          merchantName: parsedCache.merchant_name,
          amount: parsedCache.amount,
          currency: parsedCache.currency,
          receiptDate: new Date(parsedCache.receipt_date),
          status: "completed",
          fileUrl: sanitizedFileUrl,
          fileName: sanitizedFilename,
          category: parsedCache.category,
          confidence: parsedCache.confidence,
          needsReview: parsedCache.needs_review,
          isDuplicate: parsedCache.is_duplicate,
          note: parsedCache.extraction_notes,
        },
      });

      return NextResponse.json({
        success: true,
        receipt_id: receipt.id,
        status: "completed",
        message: "Receipt processed from cache",
        extracted_data: parsedCache,
      });
    }

    // Create pending receipt record
    const receipt = await prisma.receipt.create({
      data: {
        userId,
        merchantName: "Processing...",
        amount: 0,
        receiptDate: new Date(),
        status : "pending",
        fileUrl: sanitizedFileUrl,
        fileName: sanitizedFilename,
        category : "Other",
      },
    });

    // Queue the OCR processing job with QStash
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/ocr/process`;

    await qstashClient.publishJSON({
      url: webhookUrl,
      body: {
        receiptId: receipt.id,
        userId,
        file_url: sanitizedFileUrl,
        filename: sanitizedFilename,
      },
      retries: 2,
      timeout: "60s",
    });

    // Return immediately with receipt ID
    return NextResponse.json({
      success: true,
      receipt_id: receipt.id,
      status: "processing",
      message: "Receipt queued for processing",
    });
  } catch (error) {
    console.error("POST /api/ocr error:", error);
    return NextResponse.json(
      { error: "Failed to queue OCR processing" },
      { status: 500 }
    );
  }
}