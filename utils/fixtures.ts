// Test fixtures for PDF generation

export const smallFixture = {
  reportMeta: {
    period_start: "2025-10-01",
    period_end: "2025-10-31",
    generated_at: "2025-10-28T10:00:00Z",
    report_id: "RPT-2025-10-001",
    timezone: "America/Chicago",
    locale: "en-US",
    currency: "USD",
  },
  submitter: {
    name: "John Smith",
    email: "john.smith@example.com",
    title: "Sales Manager",
    department: "Sales",
    employee_id: "EMP-1234",
  },
  recipient: {
    company_name: "TechCorp LLC",
    approver_name: "Jane Manager",
    approver_email: "jane@example.com",
    address_lines: ["123 Business St", "Austin, TX 78701"],
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
    title: "Corporate Travel Policy",
    notes: ["Max hotel rate: $200/night", "Meals cap: $50/day"],
    violations: [],
  },
  summary: {
    totals_by_category: [
      { category: "Travel", amount: 245.3 },
      { category: "Meals", amount: 89.45 },
    ],
    total_reimbursable: 334.75,
    non_reimbursable: 0.0,
    per_diem_days: 2,
    per_diem_rate: 50.0,
    tax: 0.0,
  },
  line_items: [
    {
      receipt_id: "rcp_100",
      date: "2025-10-03",
      merchant: "Uber",
      category: "Travel",
      amount: 24.85,
      currency: "USD",
      converted_amount: 24.85,
      project_code: "PROJ-123",
      notes: "Airport ride",
    },
    {
      receipt_id: "rcp_101",
      date: "2025-10-04",
      merchant: "Hotel Chain",
      category: "Travel",
      amount: 220.45,
      currency: "USD",
      converted_amount: 220.45,
      project_code: "PROJ-123",
      notes: "Conference hotel",
    },
    {
      receipt_id: "rcp_102",
      date: "2025-10-04",
      merchant: "Restaurant",
      category: "Meals",
      amount: 45.2,
      currency: "USD",
      converted_amount: 45.2,
      project_code: null,
      notes: "Client dinner",
    },
    {
      receipt_id: "rcp_103",
      date: "2025-10-05",
      merchant: "Coffee Shop",
      category: "Meals",
      amount: 12.75,
      currency: "USD",
      converted_amount: 12.75,
      project_code: null,
      notes: "Morning meeting",
    },
    {
      receipt_id: "rcp_104",
      date: "2025-10-05",
      merchant: "Lunch Spot",
      category: "Meals",
      amount: 31.5,
      currency: "USD",
      converted_amount: 31.5,
      project_code: "PROJ-123",
      notes: "Team lunch",
    },
  ],
  appendix: {
    include_receipt_gallery: false,
    receipt_images: [],
  },
  signoff: {
    submitter_signature_text:
      "I certify these expenses are accurate and policy-compliant.",
    approver_signature_placeholder: true,
  },
};

export const mediumFixture = {
  ...smallFixture,
  reportMeta: {
    ...smallFixture.reportMeta,
    report_id: "RPT-2025-10-002",
    currency: "USD",
    exchange_rates: {
      EUR: 1.07,
      GBP: 1.24,
    },
  },
  branding: {
    ...smallFixture.branding,
    template: "Compact",
  },
  summary: {
    ...smallFixture.summary,
    total_reimbursable: 2456.8,
    totals_by_category: [
      { category: "Travel", amount: 1789.3 },
      { category: "Meals", amount: 445.5 },
      { category: "Supplies", amount: 222.0 },
    ],
  },
  line_items: Array.from({ length: 40 }, (_, i) => ({
    receipt_id: `rcp_${100 + i}`,
    date: `2025-10-${String(Math.floor(i / 3) + 1).padStart(2, "0")}`,
    merchant: [
      `Vendor ${i + 1}`,
      `Restaurant ${i + 1}`,
      `Hotel ${i + 1}`,
      `Taxi ${i + 1}`,
    ][i % 4],
    category: ["Travel", "Meals", "Supplies"][i % 3],
    amount: 25.0 + i * 5.5,
    currency: i % 5 === 0 ? "EUR" : "USD",
    converted_amount: i % 5 === 0 ? (25.0 + i * 5.5) * 1.07 : 25.0 + i * 5.5,
    project_code: i % 3 === 0 ? `PROJ-${100 + i}` : null,
    notes: `Business expense #${i + 1}`,
  })),
};

export const largeFixture = {
  ...smallFixture,
  reportMeta: {
    ...smallFixture.reportMeta,
    report_id: "RPT-2025-10-003",
  },
  branding: {
    ...smallFixture.branding,
    template: "Executive",
  },
  summary: {
    ...smallFixture.summary,
    total_reimbursable: 12567.45,
    totals_by_category: [
      { category: "Travel", amount: 8789.3 },
      { category: "Meals", amount: 2445.5 },
      { category: "Supplies", amount: 1332.65 },
    ],
  },
  line_items: Array.from({ length: 120 }, (_, i) => ({
    receipt_id: `rcp_${1000 + i}`,
    date: `2025-10-${String(Math.floor(i / 4) + 1).padStart(2, "0")}`,
    merchant: [
      `Corporation ${i + 1}`,
      `Diner ${i + 1}`,
      `Supplies Co ${i + 1}`,
      `Transport ${i + 1}`,
    ][i % 4],
    category: ["Travel", "Meals", "Supplies"][i % 3],
    amount: 15.0 + i * 8.75,
    currency: "USD",
    converted_amount: 15.0 + i * 8.75,
    project_code: i % 2 === 0 ? `PROJ-${200 + i}` : null,
    notes: `Large scale expense #${i + 1}`,
    policy_flag: i % 15 === 0,
  })),
  appendix: {
    include_receipt_gallery: true,
    receipt_images: Array.from({ length: 10 }, (_, i) => ({
      receipt_id: `rcp_${1000 + i * 12}`,
      image_url: `https://cdn.example.com/receipts/large_${i}.jpg`,
    })),
  },
  policy: {
    ...smallFixture.policy,
    violations: [
      {
        receipt_id: "rcp_1015",
        rule: "Hotel nightly cap",
        note: "Exceeded by $45.20",
      },
      {
        receipt_id: "rcp_1030",
        rule: "Meal limit",
        note: "Exceeded daily limit",
      },
    ],
  },
};

export const emptyFixture = {
  ...smallFixture,
  reportMeta: {
    ...smallFixture.reportMeta,
    report_id: "RPT-2025-10-EMPTY",
  },
  summary: {
    totals_by_category: [],
    total_reimbursable: 0.0,
    non_reimbursable: 0.0,
    per_diem_days: 0,
    per_diem_rate: 0.0,
    tax: 0.0,
  },
  line_items: [],
  policy: {
    ...smallFixture.policy,
    violations: [],
  },
};
