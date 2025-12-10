import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { unauthorized } from "@/lib/error";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const url = new URL(request.url);
    const receiptID = url.pathname.split("/").pop();
    if (!receiptID) return NextResponse.json({ error: "Invalid receipt ID" }, { status: 400 });

    const receiptId = parseInt(receiptID);
    if (isNaN(receiptId)) {
      return NextResponse.json({ error: "Invalid receipt ID" }, { status: 400 });
    }

    const receipt = await prisma.receipt.findFirst({
      where: {
        id: receiptId,
        userId: session.id,
      },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      status: receipt.status,
      data: receipt.status === "completed" ? {
        merchant_name: receipt.merchantName,
        amount: receipt.amount,
        currency: receipt.currency,
        receipt_date: receipt.receiptDate,
        category: receipt.category,
        confidence: receipt.confidence,
        needs_review: receipt.needsReview,
        is_duplicate: receipt.isDuplicate,
        notes: receipt.note,
      } : null,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}