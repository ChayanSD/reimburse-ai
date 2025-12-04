import { getSession } from "@/lib/session";
import { unauthorized } from "@/lib/error";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const handleDatabaseError = (error: unknown) => {
  console.error("Database error:", error);
  return NextResponse.json({ error: "Database error" }, { status: 500 });
};

export const dynamic = 'force-dynamic';

interface ReceiptForCSV {
  id: number;
  receiptDate: Date;
  merchantName: string;
  category: string;
  amount: { toString(): string };
  currency: string;
  note: string | null;
  fileUrl: string;
  createdAt: Date;
}

function generateCSV(receipts: ReceiptForCSV[]): string {
  const headers = ["id", "date", "merchant", "category", "amount", "currency", "note", "file_url", "created_at"];

  const rows = receipts.map((receipt) => [
    receipt.id || "",
    receipt.receiptDate ? receipt.receiptDate.toISOString().split('T')[0] : "N/A",
    receipt.merchantName || "Unknown",
    receipt.category || "Other",
    receipt.amount ? receipt.amount.toString() : "0.00",
    receipt.currency || "USD",
    receipt.note || "",
    receipt.fileUrl || "",
    receipt.createdAt ? receipt.createdAt.toISOString() : "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => 
      row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  return csvContent;
}

export async function POST(): Promise<NextResponse> {
  try {
    const session = await getSession();
    
    if (!session) {
      return unauthorized();
    }

    const userId = session.id;

    // Fetch all receipts for the user using Prisma
    // Order by receipt date descending to give the most recent data first
    const receipts = await prisma.receipt.findMany({
      where: {
        userId,
      },
      orderBy: [
        { receiptDate: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const csvContent = generateCSV(receipts);
    const filename = `reimburseme-data-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error("POST /api/exports/csv error:", error);
    return handleDatabaseError(error);
  }
}
