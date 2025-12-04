import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

// Get metrics for the last 30 days
async function getMetrics() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Receipts today
  const receiptsToday = await prisma.receipt.count({
    where: {
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  // Receipts yesterday for comparison
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const receiptsYesterday = await prisma.receipt.count({
    where: {
      createdAt: {
        gte: yesterday,
        lt: today,
      },
    },
  });

  // Reports today
  const reportsToday = await prisma.report.count({
    where: {
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  // Reports yesterday for comparison
  const reportsYesterday = await prisma.report.count({
    where: {
      createdAt: {
        gte: yesterday,
        lt: today,
      },
    },
  });

  // OCR success rate (assuming we track this in audit_log)
  const ocrAttempts = await prisma.auditLog.count({
    where: {
      eventType: 'OCR_PROCESSED',
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
  });

  const ocrFailures = await prisma.auditLog.count({
    where: {
      eventType: 'OCR_FAILED',
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
  });

  // Active subscriptions
  const activeSubscriptions = await prisma.authUser.count({
    where: {
      subscriptionStatus: 'active',
    },
  });

  // Receipts over last 30 days
  const receipts30Days = await prisma.receipt.count({
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
  });

  // Calculate changes
  const receiptsChange = receiptsYesterday > 0 
    ? Math.round(((receiptsToday - receiptsYesterday) / receiptsYesterday) * 100)
    : 0;

  const reportsChange = reportsYesterday > 0 
    ? Math.round(((reportsToday - reportsYesterday) / reportsYesterday) * 100)
    : 0;

  const totalOcrAttempts = ocrAttempts + ocrFailures;
  const ocrSuccessRate = totalOcrAttempts > 0 
    ? ocrAttempts / totalOcrAttempts 
    : 0;

  return {
    receipts_today: receiptsToday,
    receipts_change: receiptsChange,
    reports_today: reportsToday,
    reports_change: reportsChange,
    ocr_success_rate: ocrSuccessRate,
    ocr_change: 0, // Would need historical data to calculate
    active_subscriptions: activeSubscriptions,
    subscription_change: 0, // Would need historical data to calculate
    receipts_30_days: receipts30Days,
  };
}

// Detect anomalies
async function detectAnomalies() {
  const anomalies = [];

  // Check for large amounts
  const largeAmounts = await prisma.receipt.findMany({
    where: {
      amount: {
        gt: 1000, // Using Prisma Decimal comparison
      },
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
    },
    orderBy: {
      amount: 'desc',
    },
    take: 10,
  });

  if (largeAmounts.length > 0) {
    anomalies.push({
      type: "Large Amounts",
      description: `${largeAmounts.length} receipts over $1,000 in the last 7 days`,
      detected_at: new Date().toISOString(),
      severity: "medium",
      data: largeAmounts
    });
  }

  // Check for duplicate candidates
  const duplicates = await prisma.receipt.groupBy({
    by: ['merchantName', 'amount', 'receiptDate'],
    where: {
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      },
    },
    having: {
      id: {
        _count: {
          gt: 1,
        },
      },
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: 5,
  });

  if (duplicates.length > 0) {
    anomalies.push({
      type: "Potential Duplicates",
      description: `${duplicates.length} sets of receipts with identical merchant, amount, and date`,
      detected_at: new Date().toISOString(),
      severity: "low",
      data: duplicates
    });
  }

  // Check for future dates
  const futureDates = await prisma.receipt.findMany({
    where: {
      receiptDate: {
        gt: new Date(),
      },
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
    },
    take: 10,
  });

  if (futureDates.length > 0) {
    anomalies.push({
      type: "Future Dates",
      description: `${futureDates.length} receipts with future dates`,
      detected_at: new Date().toISOString(),
      severity: "high",
      data: futureDates
    });
  }

  // Check for high OCR failure rate
  const recentOcrAttempts = await prisma.auditLog.count({
    where: {
      eventType: 'OCR_PROCESSED',
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      },
    },
  });

  const recentOcrFailures = await prisma.auditLog.count({
    where: {
      eventType: 'OCR_FAILED',
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      },
    },
  });

  const totalRecentOcr = recentOcrAttempts + recentOcrFailures;
  const failureRate = totalRecentOcr > 0 ? recentOcrFailures / totalRecentOcr : 0;

  if (failureRate > 0.3 && totalRecentOcr > 5) {
    anomalies.push({
      type: "High OCR Failure Rate",
      description: `${Math.round(failureRate * 100)}% OCR failure rate in the last 24 hours`,
      detected_at: new Date().toISOString(),
      severity: "high",
      data: { failureRate, totalAttempts: totalRecentOcr }
    });
  }

  return anomalies;
}

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get metrics and anomalies
    const [metrics, anomalies] = await Promise.all([
      getMetrics(),
      detectAnomalies()
    ]);

    return NextResponse.json({
      success: true,
      metrics,
      anomalies,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error("GET /api/admin/dashboard error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

