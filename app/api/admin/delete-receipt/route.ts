import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { logActivity } from "@/utils/audit";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { receipt_id } = body as { receipt_id?: number };

    if (!receipt_id) {
      return NextResponse.json(
        { error: "Receipt ID is required" },
        { status: 400 }
      );
    }

    // Get receipt info before deletion for logging
    const receipt = await prisma.receipt.findUnique({
      where: { id: receipt_id },
      select: {
        id: true,
        userId: true,
        merchantName: true,
        amount: true,
        category: true,
      },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // Delete the receipt
    await prisma.receipt.delete({
      where: { id: receipt_id },
    });

    // Log the admin action
    await logActivity(session.id, "Admin deleted receipt", {
      deleted_receipt_id: receipt_id,
      receipt_owner: receipt.userId,
      merchant: receipt.merchantName,
      amount: receipt.amount.toString(),
      admin_action: true,
    });

    // Log for the receipt owner as well
    if (receipt.userId !== session.id) {
      await logActivity(receipt.userId, "Receipt deleted by admin", {
        receipt_id: receipt_id,
        deleted_by_admin: session.id,
        merchant: receipt.merchantName,
        amount: receipt.amount.toString(),
      });
    }

    return NextResponse.json({
      message: "Receipt deleted successfully",
      receipt_id: receipt_id,
    });
  } catch (error) {
    console.error("Admin delete receipt error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
