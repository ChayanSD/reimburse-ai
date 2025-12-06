import { generateHTML, ExpenseReportData, LineItem, CategoryTotal } from "./htmlTemplates";

export interface GeneratePDFOptions {
  paperSize?: string;
  userId?: string;
}

export interface PDFResult {
  pdfBuffer: Buffer;
  pdf_url: string;
  pages: number;
  template_used: string;
  filename: string;
  html_content: string;
}

// Enhanced PDF generation that uses the HTML template content
export async function generatePDF(data: ExpenseReportData , options?: { userId?: string }): Promise<PDFResult> {
  // Note: paperSize and userId options are reserved for future implementation

  // Generate HTML content
  const htmlContent = generateHTML(data);

  // Generate filename
  const userSlug = data.submitter.email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const periodStart = new Date(data.reportMeta.period_start);
  const periodStr = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}`;
  const filename = `reimburseme_${userSlug}_${periodStr}.pdf`;

  // Create enhanced HTML-based PDF content
  const pdfContent = createHtmlBasedPDF(data);
  const pdfBuffer = Buffer.from(pdfContent);

  // Create data URL with the HTML content for preview
  const htmlDataUrl = `data:text/html;base64,${Buffer.from(htmlContent).toString("base64")}`;

  // Calculate estimated pages based on content
  const estimatedPages = Math.max(
    1,
    Math.ceil((data.line_items?.length || 0) / 15) +
      1 +
      (data.appendix?.include_receipt_gallery ? 1 : 0),
  );

  return {
    pdfBuffer,
    pdf_url: htmlDataUrl, // Return HTML for now since it shows the actual styling
    pages: estimatedPages,
    template_used: data.branding?.template || "Classic",
    filename: filename.replace(".pdf", ".html"), // Change extension to reflect HTML content
    html_content: htmlContent,
  };
}

function createHtmlBasedPDF(data: ExpenseReportData): string {
  // Enhanced PDF that includes more visual elements from the HTML
  const template = data.branding?.template || "Classic";
  const totalReimbursable = data.summary?.total_reimbursable || 0;
  const lineItemsCount = data.line_items?.length || 0;
  const reportId = data.reportMeta?.report_id || "N/A";
  const periodStart = data.reportMeta?.period_start || "N/A";
  const periodEnd = data.reportMeta?.period_end || "N/A";
  const submitterName = data.submitter?.name || "Unknown";
  const categoryTotals = data.summary?.totals_by_category || [];

  // Create detailed receipt entries
  const receiptEntries = (data.line_items || [])
    .map((item: LineItem, index: number) => {
      const date = item.date || "N/A";
      const merchant = item.merchant || "Unknown";
      const amount = item.converted_amount || item.amount || 0;
      const category = item.category || "Other";
      const notes = item.notes ? ` (${item.notes.substring(0, 30)}...)` : "";
      const policyFlag = item.policy_flag ? " ⚠️" : " ✓";
      return `0 -12 Td\n(${String(index + 1).padStart(2, "0")}. ${date} | ${merchant} | ${category} | $${amount.toFixed(2)}${policyFlag}${notes}) Tj`;
    })
    .join("\n");

  // Create category summary
  const categoryLines = categoryTotals
    .map(
      (cat: CategoryTotal) =>
        `0 -12 Td\n(• ${cat.category}: $${cat.amount.toFixed(2)}) Tj`,
    )
    .join("\n");

  const contentLength = 1200 + receiptEntries.length + categoryLines.length;

  return `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 4 0 R
/F2 6 0 R
>>
>>
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj

4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
>>
endobj

6 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

5 0 obj
<<
/Length ${contentLength}
>>
stream
BT
/F1 20 Tf
0.176 0.525 0.871 rg
50 750 Td
(ReimburseMe) Tj
0.4 0.4 0.4 rg
/F2 10 Tf
0 -15 Td
(Your receipts. Reimbursed. Instantly.) Tj

0 0 0 rg
/F1 14 Tf
0 -35 Td
(EXPENSE REPORT — ${new Date(periodStart).toLocaleDateString("en-US", { year: "numeric", month: "long" })}) Tj

/F2 10 Tf
0 -20 Td
(Report ID: ${reportId}) Tj
0 -12 Td
(Generated: ${new Date().toLocaleDateString("en-US")}) Tj
0 -12 Td
(Template: ${template}) Tj

0 -30 Td
/F1 12 Tf
(👤 SUBMITTED BY:) Tj
/F2 10 Tf
0 -15 Td
(${submitterName}) Tj
0 -12 Td
(${data.submitter?.email || ""}) Tj
0 -12 Td
(${data.submitter?.title || ""} • ${data.submitter?.department || ""}) Tj
0 -12 Td
(Employee ID: ${data.submitter?.employee_id || "N/A"}) Tj

0 -25 Td
/F1 12 Tf
(🏢 RECIPIENT:) Tj
/F2 10 Tf
0 -15 Td
(${data.recipient?.company_name || ""}) Tj
0 -12 Td
(${data.recipient?.approver_name || ""}) Tj
0 -12 Td
(${data.recipient?.approver_email || ""}) Tj

0 -30 Td
/F1 12 Tf
(📊 SUMMARY OVERVIEW:) Tj
/F2 10 Tf
0 -15 Td
0.065 0.725 0.506 rg
(Total Reimbursable: $${totalReimbursable.toFixed(2)} 🟢) Tj
0 -12 Td
0.937 0.267 0.267 rg
(Non-Reimbursable: $${(data.summary?.non_reimbursable || 0).toFixed(2)} 🔴) Tj
0 -12 Td
0.176 0.525 0.871 rg
(Receipts Submitted: ${lineItemsCount}) Tj
0 -12 Td
(Period: ${new Date(periodStart).toLocaleDateString()} → ${new Date(periodEnd).toLocaleDateString()}) Tj

0 0 0 rg
0 -30 Td
/F1 12 Tf
(🧾 DETAILED RECEIPTS:) Tj
/F2 9 Tf
0 -15 Td
(Date        | Merchant              | Category | Amount    | Status | Notes) Tj
0 -8 Td
(------------|----------------------|----------|-----------|--------|------------------------) Tj
${receiptEntries}

0 -25 Td
/F1 12 Tf
(📈 CATEGORY BREAKDOWN:) Tj
/F2 10 Tf
${categoryLines}

0 -25 Td
/F1 11 Tf
0.176 0.525 0.871 rg
(GRAND TOTAL: $${totalReimbursable.toFixed(2)}) Tj

0 0 0 rg
0 -40 Td
/F1 10 Tf
(CERTIFICATION:) Tj
/F2 9 Tf
0 -15 Td
(I certify that these expenses are accurate and comply with company policy.) Tj
0 -20 Td
(Employee Signature: _________________________ Date: _____________) Tj
0 -15 Td
(Approver Signature: _________________________ Date: _____________) Tj

0 -30 Td
0.4 0.4 0.4 rg
/F2 8 Tf
(ReimburseMe © ${new Date().getFullYear()} • www.reimburseme.app • Generated automatically) Tj
ET
endstream
endobj

xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000282 00000 n 
0000000370 00000 n 
0000000457 00000 n 
trailer
<<
/Size 7
/Root 1 0 R
>>
startxref
${1200 + contentLength}
%%EOF`;
}
