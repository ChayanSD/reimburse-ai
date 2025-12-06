import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logActivity, EVENTS } from "@/utils/audit";
import { receiptUpdateSchema } from "@/validation/receipt.validation";
import prisma from "@/lib/prisma";

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const notFound = (message: string) => NextResponse.json({ error: message }, { status: 404 });
const handleValidationError = (error: unknown) => NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 });
const handleDatabaseError = (error: unknown) => {
  console.error('Database error:', error);
  return NextResponse.json({ error: 'Database error' }, { status: 500 });
};
export async function GET(request: NextRequest) : Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorized();
    }

    const userId = session.id;
    const url = new URL(request.url);
    const receiptId = parseInt(url.pathname.split('/').pop() || '');

    if (isNaN(receiptId)) {
      return NextResponse.json({ error: "Invalid receipt ID" }, { status: 400 });
    }

    const receipt = await prisma.receipt.findFirst({
      where: {
        id: receiptId,
        userId,
      },
    });

    if (!receipt) {
      return notFound("Receipt not found");
    }

    return NextResponse.json({ receipt });
  } catch (error) {
    console.error("GET /api/receipts/[id] error:", error);
    return handleDatabaseError(error);
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorized();
    }

    const userId = session.id;
    const url = new URL(request.url);
    const receiptId = parseInt(url.pathname.split('/').pop() || '');

    if (isNaN(receiptId)) {
      return NextResponse.json({ error: "Invalid receipt ID" }, { status: 400 });
    }

    const body = await request.json();

    // Validate input with Zod
    const validation = receiptUpdateSchema.safeParse(body);
    if (!validation.success) {
      return handleValidationError(validation.error);
    }

    const updateData = validation.data;

    // Check if receipt exists and belongs to user, and update in one query
    const updateDataPrisma: {
      merchantName?: string;
      receiptDate?: Date;
      amount?: number;
      category?: string;
      note?: string;
      currency?: string;
    } = {};
    if (updateData.merchant_name !== undefined) updateDataPrisma.merchantName = updateData.merchant_name;
    if (updateData.receipt_date !== undefined) updateDataPrisma.receiptDate = new Date(updateData.receipt_date);
    if (updateData.amount !== undefined) updateDataPrisma.amount = updateData.amount;
    if (updateData.category !== undefined) updateDataPrisma.category = updateData.category;
    if (updateData.note !== undefined) updateDataPrisma.note = updateData.note;
    if (updateData.currency !== undefined) updateDataPrisma.currency = updateData.currency;

    if (Object.keys(updateDataPrisma).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updatedReceipt = await prisma.receipt.updateMany({
      where: {
        id: receiptId,
        userId,
      },
      data: updateDataPrisma,
    });

    if (updatedReceipt.count === 0) {
      return notFound("Receipt not found");
    }

    // Fetch the updated receipt
    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
    });

    return NextResponse.json({ receipt });
  } catch (error) {
    console.error("PUT /api/receipts/[id] error:", error);
    return handleDatabaseError(error);
  }
}

export async function DELETE(request: NextRequest) : Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorized();
    }

    const userId = session.id;
    const url = new URL(request.url);
    const receiptId = parseInt(url.pathname.split('/').pop() || '');

    if (isNaN(receiptId)) {
      return NextResponse.json({ error: "Invalid receipt ID" }, { status: 400 });
    }

    const deletedReceipt = await prisma.receipt.deleteMany({
      where: {
        id: receiptId,
        userId,
      },
    });

    if (deletedReceipt.count === 0) {
      return notFound("Receipt not found");
    }

    // Log the activity for admin tracking
    await logActivity(userId, EVENTS.RECEIPT_DELETED, {
      receipt_id: receiptId,
    });

    return NextResponse.json({ message: "Receipt deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/receipts/[id] error:", error);
    return handleDatabaseError(error);
  }
}