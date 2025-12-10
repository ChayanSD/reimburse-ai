import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import {
  aiOCRExtraction,
  checkForDuplicate,
  normalizeCurrency,
  normalizeMerchant,
  parseDateRobust,
} from "@/lib/ocrProcessing";
import prisma from "@/lib/prisma";

interface ExtractedData {
  merchant_name: string;
  amount: number;
  category: string;
  receipt_date: string;
  confidence: string;
  date_source: string;
  extraction_notes?: string;
  currency?: string;
}

interface OCRRequestBody {
  receiptId: number;
  userId: number;
  file_url: string;
  filename: string;
}

export const runtime = "nodejs";
export const maxDuration = 60; // Allow 60s for background processing

async function handler(request: NextRequest): Promise<NextResponse> {
  let receiptId: number | undefined;

  try {
    // Parse and validate request body
    const body: OCRRequestBody = await request.json();
    
    // Destructure with validation
    const { receiptId: id, userId, file_url, filename } = body;
    
    if (!id || !userId || !file_url) {
      console.error("Missing required fields:", { id, userId, file_url });
      return NextResponse.json(
        { error: "Missing required fields: receiptId, userId, or file_url" },
        { status: 400 }
      );
    }

    receiptId = id;
    console.log("Processing OCR for receipt:", receiptId, { userId, filename });

    // Extract data using AI with timeout protection
    const extractedData = await Promise.race<ExtractedData>([
      aiOCRExtraction(file_url, filename),
      new Promise<ExtractedData>((_, reject) =>
        setTimeout(() => reject(new Error("OCR timeout after 50 seconds")), 50000)
      ),
    ]);

    console.log("OCR extraction completed:", { receiptId, merchant: extractedData.merchant_name });

    // Process and normalize data
    const merchant = normalizeMerchant(extractedData.merchant_name);
    const currency = normalizeCurrency(extractedData.amount.toString(), "USD");
    const date = parseDateRobust(extractedData.receipt_date) || extractedData.receipt_date;

    console.log("Normalized data:", { merchant, amount: currency.amount, date });

    // Check for duplicates
    const isDuplicate = await checkForDuplicate(
      userId,
      merchant,
      currency.amount,
      date
    );

    // Calculate confidence score
    const confidence = 
      extractedData.confidence === "high" ? 0.9 :
      extractedData.confidence === "medium" ? 0.7 : 0.5;

    // Update receipt in database
    await prisma.receipt.update({
      where: { id: receiptId },
      data: {
        merchantName: merchant,
        amount: currency.amount,
        currency: currency.currency,
        receiptDate: new Date(date),
        category: extractedData.category,
        confidence,
        needsReview: confidence < 0.72,
        isDuplicate,
        status: "completed",
        note: extractedData.extraction_notes || "Processed successfully",
        updatedAt: new Date(),
      },
    });

    console.log("OCR processing completed successfully:", receiptId);

    return NextResponse.json({
      success: true,
      receiptId,
      data: {
        merchant,
        amount: currency.amount,
        currency: currency.currency,
        date,
        confidence,
      },
    });

  } catch (error) {
    console.error("OCR processing error:", {
      receiptId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Update receipt with error status if we have a receiptId
    if (receiptId) {
      try {
        await prisma.receipt.update({
          where: { id: receiptId },
          data: {
            status: "failed",
            note: `Processing failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            updatedAt: new Date(),
          },
        });
        console.log("Receipt marked as failed:", receiptId);
      } catch (dbError) {
        console.error("Failed to update receipt status:", {
          receiptId,
          error: dbError instanceof Error ? dbError.message : "Unknown DB error",
        });
      }
    }

    // Return error response
    return NextResponse.json(
      {
        error: "OCR processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
        receiptId,
      },
      { status: 500 }
    );
  }
}

// Verify QStash signature for security
export const POST = verifySignatureAppRouter(handler);

// ============================================
// OPTIONAL: Add GET endpoint for health check
// ============================================
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    service: "OCR Processor",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
}