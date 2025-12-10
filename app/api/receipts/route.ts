import { getSession } from "@/lib/session";
import { logActivity, EVENTS } from "@/utils/audit";
import { receiptCreateSchema } from "@/validation/receipt.validation";
import { z } from "zod";
import { checkSubscriptionLimit, incrementUsage } from "@/lib/subscriptionGuard";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";


const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.string().optional(),
});


const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const handleValidationError = (error : unknown) => NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 });
const handleDatabaseError = (error: unknown) => {
  console.error('Database error:', error);
  return NextResponse.json({ error: 'Database error' }, { status: 500 });
};
const paymentRequired = (message: string, data?: Record<string, unknown>) => NextResponse.json({ error: message, ...data }, { status: 402 });

export async function GET(request : NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorized();
    }

    const userId = session.id;
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const queryParams = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      category: searchParams.get("category") || undefined,
    };

    const validation = paginationSchema.safeParse(queryParams);
    if (!validation.success) {
      return handleValidationError(validation.error);
    }

    const { page, limit, from, to, category } = validation.data;
    const offset = (page - 1) * limit;


    // Build where clause
    const where: {
      userId: number;
      receiptDate?: { gte?: Date; lte?: Date };
      category?: string;
    } = { userId };

    if (from) {
      where.receiptDate = { ...where.receiptDate, gte: new Date(from) };
    }

    if (to) {
      where.receiptDate = { ...where.receiptDate, lte: new Date(to) };
    }

    if (category) {
      where.category = category;
    }

    const receipts = await prisma.receipt.findMany({
      where,
      orderBy: [
        { receiptDate: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: offset,
      take: limit,
    });

    const total = await prisma.receipt.count({ where });

    // Transform the data to match frontend interface (snake_case and correct types)
    const transformedReceipts = receipts.map(receipt => ({
      id: receipt.id.toString(),
      receipt_date: receipt.receiptDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      merchant_name: receipt.merchantName,
      amount: receipt.amount.toString(),
      category: receipt.category,
      file_url: receipt.fileUrl,
      // Include other fields that might be needed
      currency: receipt.currency,
      note: receipt.note,
      needs_review: receipt.needsReview,
      is_duplicate: receipt.isDuplicate,
      confidence: receipt.confidence?.toString() || null,
      created_at: receipt.createdAt.toISOString(),
      updated_at: receipt.updatedAt.toISOString(),
    }));

    return NextResponse.json({ 
      receipts: transformedReceipts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error("GET /api/receipts error:", error);
    return handleDatabaseError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorized();
    }

    const userId = session.id;
    const body = await request.json();

    // Check subscription limits for receipt uploads
    const subscriptionCheck = await checkSubscriptionLimit(userId, 'receipt_uploads');
    if (!subscriptionCheck.allowed) {
      return paymentRequired(subscriptionCheck.reason || 'Subscription limit reached', {
        upgradeRequired: subscriptionCheck.upgradeRequired,
        currentTier: subscriptionCheck.currentTier,
      });
    }


    // Validate input with Zod
    const validation = receiptCreateSchema.safeParse(body);
    if (!validation.success) {
      return handleValidationError(validation.error);
    }

    const { file_url, merchant_name, receipt_date, amount, category, note, currency } = validation.data;

    // Check for duplicate receipts (same merchant, amount, date within 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const duplicateCheck = await prisma.receipt.findFirst({
      where: {
        userId,
        merchantName: merchant_name,
        amount,
        receiptDate: new Date(receipt_date),
        createdAt: {
          gt: ninetyDaysAgo,
        },
      },
    });

    if (duplicateCheck) {
      return NextResponse.json({
        error: "Duplicate receipt detected",
        fieldErrors: {
          general: "A receipt with the same merchant, amount, and date already exists within the last 90 days"
        }
      }, { status: 409 });
    }

    const receipt = await prisma.receipt.create({
      data: {
        userId,
        fileName : file_url.split("/").pop() || "",
        fileUrl: file_url,
        merchantName: merchant_name,
        receiptDate: new Date(receipt_date),
        amount,
        category,
        note: note || null,
        currency,
      },
    });

    // Increment usage counter
    await incrementUsage(userId, 'receipt_uploads');

    // Log the activity for admin tracking
    await logActivity(userId, EVENTS.RECEIPT_UPLOADED, {
      receipt_id: receipt.id,
      merchant_name,
      amount,
      category,
    });

    return NextResponse.json({ receipt }, { status: 201 });
  } catch (error) {
    console.error("POST /api/receipts error:", error);
    return handleDatabaseError(error);
  }
}
