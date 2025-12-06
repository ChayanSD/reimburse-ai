import { NextRequest, NextResponse } from "next/server";
import { reportCreateSchema } from "@/validation/report.validation";
import { checkSubscriptionLimit, incrementUsage, getUserSubscriptionInfo, getSubscriptionLimits } from "@/lib/subscriptionGuard";
import { generatePDF, PDFResult } from "@/utils/pdfGenerator";
import { badRequest, unauthorized, notFound, subscriptionLimitReached, handleDatabaseError, handleValidationError } from "@/lib/error";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { AuthUser, CompanySettings, Receipt } from "../../generated/prisma/client";



function generateCSV(receipts: Receipt[], periodStart: string, periodEnd: string) {
  const headers = ["id", "date", "merchant", "category", "amount", "currency", "note", "file_url"];
  const rows = receipts.map((receipt) => [
    receipt.id || "",
    receipt.receiptDate?.toISOString().split('T')[0] || "N/A",
    receipt.merchantName || "Unknown",
    receipt.category || "Other",
    receipt.amount.toString() || "0.00",
    receipt.currency || "USD",
    receipt.note || "",
    receipt.fileUrl || "",
  ]);

  const csvContent = [
    `Report Period,${periodStart} to ${periodEnd}`,
    `Generated At,${new Date().toISOString()}`,
    `Total Receipts,${receipts.length}`,
    "",
    headers.join(","),
    ...rows.map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  return csvContent;
}

// Convert receipts data to PDF export format
function convertToPDFFormat(
  receipts: Receipt[],
  periodStart: string,
  totalAmount: number,
  user: Pick<AuthUser, 'id' | 'email' | 'firstName' | 'lastName'>,
  companySetting: CompanySettings | null = null,
  periodEnd: string | null = null,
  title: string | null = null,
) {
  // Use provided period or generate from month
  const startDate = periodStart || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
  const endDate = periodEnd || new Date(
    new Date(startDate).getFullYear(),
    new Date(startDate).getMonth() + 1,
    0,
  ).toISOString().split("T")[0];

  const categoryTotals = receipts.reduce((acc: Record<string, number>, receipt) => {
    const category = receipt.category || "Other";
    acc[category] = (acc[category] || 0) + receipt.amount.toNumber();
    return acc;
  }, {});

  // Build address lines from company setting
  let address_lines = ["123 Business St", "City, State 12345"]; // fallback
  if (companySetting) {
    address_lines = [];
    if (companySetting.addressLine1)
      address_lines.push(companySetting.addressLine1);
    if (companySetting.addressLine2)
      address_lines.push(companySetting.addressLine2);

    // Build city, state, zip line
    const locationParts = [];
    if (companySetting.city) locationParts.push(companySetting.city);
    if (companySetting.state) locationParts.push(companySetting.state);
    if (companySetting.zipCode) locationParts.push(companySetting.zipCode);
    if (locationParts.length > 0) {
      address_lines.push(locationParts.join(", "));
    }

    // Add country if not US
    if (companySetting.country && companySetting.country !== "United States") {
      address_lines.push(companySetting.country);
    }

    // Ensure we have at least one address line
    if (address_lines.length === 0) {
      address_lines.push("Address not provided");
    }
  }

  // Construct full name from firstName and lastName
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email ||
    "User";

  // Generate report ID with proper format
  const reportId = `RPT-${startDate.replace(/-/g, "").substring(0, 6)}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;

  return {
    reportMeta: {
      period_start: startDate,
      period_end: endDate,
      generated_at: new Date().toISOString(),
      report_id: reportId,
      timezone: "America/Chicago",
      locale: "en-US",
      currency: "USD",
    },
    submitter: {
      name: fullName,
      email: user.email,
      title: "Employee",
      department: companySetting?.department || "General",
      employee_id: `EMP-${user.id}`,
    },
    recipient: {
      company_name: companySetting?.companyName || "Company Name",
      approver_name: companySetting?.approverName || "Manager",
      approver_email: companySetting?.approverEmail || "manager@company.com",
      address_lines: address_lines,
    },
    branding: {
      primary_color: "#2E86DE",
      accent_color: "#10B981",
      neutral_bg: "#F7F8FA",
      font_heading: "Poppins",
      font_body: "Inter",
      template: "Classic",
    },
    policy: {
      title: "Expense Reimbursement Policy",
      notes: companySetting?.notes
        ? [companySetting.notes]
        : [
            "Submit receipts within 30 days",
            "Business expenses only",
            "Approval required for amounts over $100",
          ],
      violations: [],
    },
    summary: {
      totals_by_category: Object.entries(categoryTotals).map(
        ([category, amount]) => ({
          category,
          amount: amount,
        }),
      ),
      total_reimbursable: totalAmount,
      non_reimbursable: 0.0,
      per_diem_days: 0,
      per_diem_rate: 0.0,
      tax: 0.0,
    },
    line_items: receipts.map((receipt) => ({
      receipt_id: receipt.id,
      date: receipt.receiptDate.toISOString().split('T')[0],
      merchant: receipt.merchantName || "Unknown",
      category: receipt.category || "Other",
      amount: receipt.amount.toNumber(),
      currency: receipt.currency || "USD",
      converted_amount: receipt.amount.toNumber(),
      project_code: companySetting?.costCenter || null,
      notes: receipt.note || `Receipt from ${receipt.receiptDate.toISOString().split('T')[0] || "unknown date"}`,
      policy_flag: false,
      file_url: receipt.fileUrl, // Add receipt file URL for linking
    })),
    appendix: {
      include_receipt_gallery: false,
      receipt_images: [],
    },
    signoff: {
      submitter_signature_text: "I certify that these expenses are accurate and incurred for work-related purposes. I understand that any false or misleading information may result in disciplinary action.",
      approver_signature_placeholder: true,
    },
    title: title || `Expense Report - ${startDate} to ${endDate}`,
  };
}

export async function POST(request : NextRequest) : Promise<NextResponse>{
  try {
    const session = await getSession();

    if (!session) {
      return unauthorized();
    }

    const userId = session.id;

    // Check subscription limits for report exports
    const subscriptionCheck = await checkSubscriptionLimit(userId, 'report_exports');
    if (!subscriptionCheck.allowed) {
      // Get current usage for better error message
      const subscription = await getUserSubscriptionInfo(userId);
      const limits = getSubscriptionLimits(subscription?.tier || 'free');
      
      return subscriptionLimitReached(
        'Reports',
        subscription?.usageReports || 0,
        limits.maxReports,
        '/plans'
      );
    }

    const body = await request.json();

    // Validate input with Zod
    const validation = reportCreateSchema.safeParse(body);
    if (!validation.success) {
      return handleValidationError(validation.error);
    }

    const { receipt_ids, period_start, period_end, title, format, company_setting_id } = validation.data;

    // Fetch user data with first_name and last_name
    const user = await prisma.authUser.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true }
    });

    if (!user) {
      return notFound("User not found");
    }

    // Get receipts by IDs with proper user scoping
    const receipts = await prisma.receipt.findMany({
      where: {
        userId: userId,
        id: { in: receipt_ids },
        receiptDate: {
          gte: new Date(period_start),
          lte: new Date(period_end)
        }
      },
      orderBy: { receiptDate: 'desc' }
    });

    if (receipts.length === 0) {
      return badRequest("No receipts found for the selected period");
    }

    // Get company settings if specified
    let companySetting = null;
    if (company_setting_id !== null && company_setting_id !== undefined) {
      companySetting = await prisma.companySettings.findUnique({
        where: { id: company_setting_id, userId: userId }
      });
    }

    // If no specific company setting, try to get the default
    if (!companySetting) {
      companySetting = await prisma.companySettings.findFirst({
        where: { userId: userId, isDefault: true }
      });
    }

    // If still no company setting, get any company setting or use fallback
    if (!companySetting) {
      companySetting = await prisma.companySettings.findFirst({
        where: { userId: userId }
      });
    }

    const totalAmount = receipts.reduce(
      (sum, receipt) => sum + receipt.amount.toNumber(),
      0,
    );

    let reportData;
    let mimeType;
    let filename;
    let reportUrl;

    if (format === "csv") {
      reportData = generateCSV(receipts, period_start, period_end);
      mimeType = "text/csv";
      filename = `expense-report-${period_start}-to-${period_end}.csv`;

      const blob = Buffer.from(reportData).toString("base64");
      reportUrl = `data:${mimeType};base64,${blob}`;
    } else {
      // Use new professional PDF export with company settings and proper user name
      const pdfData = convertToPDFFormat(
        receipts,
        period_start,
        totalAmount,
        user,
        companySetting,
        period_end,
        title
      );
      const pdfResult = await generatePDF(pdfData, { userId: userId.toString() });

      reportData = pdfResult;
      mimeType = "application/pdf";
      filename = pdfResult.filename;
      reportUrl = pdfResult.pdf_url;
    }

    // Save report record to database
    const report = await prisma.report.create({
      data: {
        userId,
        periodStart: new Date(period_start),
        periodEnd: new Date(period_end),
        title,
        totalAmount,
        csvUrl: format === "csv" ? reportUrl : null,
        pdfUrl: format === "pdf" ? reportUrl : null,
        receiptCount: receipts.length
      }
    });

    // Increment usage counter
    await incrementUsage(userId, 'report_exports');

    if (format === "pdf") {
      return NextResponse.json({
        success: true,
        report: report,
        download_url: reportUrl,
        filename,
        total_amount: totalAmount,
        receipt_count: receipts.length,
        pages: (reportData as PDFResult).pages,
        template_used: (reportData as PDFResult).template_used,
      });
    }

    return NextResponse.json({
      success: true,
      report: report,
      download_url: reportUrl,
      filename,
      total_amount: totalAmount,
      receipt_count: receipts.length,
    });
  } catch (error) {
    console.error("POST /api/reports error:", error);
    return handleDatabaseError(error as Error);
  }
}

export async function GET() : Promise<NextResponse> {
  try {
    const session = await getSession();

    if (!session) {
      return unauthorized();
    }

    const userId = session.id;

    const reports = await prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("GET /api/reports error:", error);
    return handleDatabaseError(error as Error);
  }
}