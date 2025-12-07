import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const currentUser = await prisma.authUser.findUnique({
      where: { id: session.id },
      select: { role: true },
    });

    if (currentUser?.role !== "ADMIN" && session.id !== 1) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { user_id, timeframe = "30d" } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const userIdInt = Number(user_id);

    // Get user basic info
    const userInfo = await prisma.authUser.findUnique({
      where: { id: userIdInt },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        subscriptionTier: true,
        role: true,
        createdAt: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
        trialStart: true,
        trialEnd: true,
      },
    });

    if (!userInfo) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user statistics
    const userStats = await prisma.receipt.aggregate({
      where: { userId: userIdInt },
      _count: { _all: true },
      _sum: { amount: true },
    });

    // Get period-specific statistics
    let periodStats = { receipts_this_period: 0, amount_this_period: 0 };
    if (timeframe !== "all") {
      const timeframeDays: Record<string, number> = {
        "7d": 7,
        "30d": 30,
        "90d": 90,
      };
      const days = timeframeDays[timeframe] || 30;
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      const periodAgg = await prisma.receipt.aggregate({
        where: {
          userId: userIdInt,
          createdAt: { gte: sinceDate },
        },
        _count: { _all: true },
        _sum: { amount: true },
      });

      periodStats = {
        receipts_this_period: periodAgg._count._all || 0,
        amount_this_period: Number(periodAgg._sum.amount || 0),
      };
    }

    // Get reports count
    const reportsStats = await prisma.report.aggregate({
      where: { userId: userIdInt },
      _count: { _all: true },
    });

    let reportsThisPeriod = { reports_this_period: 0 };
    if (timeframe !== "all") {
      const timeframeDays: Record<string, number> = {
        "7d": 7,
        "30d": 30,
        "90d": 90,
      };
      const days = timeframeDays[timeframe] || 30;
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      const reportsAgg = await prisma.report.aggregate({
        where: {
          userId: userIdInt,
          createdAt: { gte: sinceDate },
        },
        _count: { _all: true },
      });

      reportsThisPeriod = { reports_this_period: reportsAgg._count._all || 0 };
    }

    // Get recent activity
    const recentActivity = await prisma.auditLog.findMany({
      where: { userId: userIdInt },
      select: {
        eventType: true,
        createdAt: true,
        eventData: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Get category breakdown
    const categoryBreakdown = await prisma.receipt.groupBy({
      by: ["category"],
      where: { userId: userIdInt },
      _count: { _all: true },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    });

    // Get user receipts (limited to recent ones)
    let receipts;
    if (timeframe === "all") {
      receipts = await prisma.receipt.findMany({
        where: { userId: userIdInt },
        select: {
          id: true,
          merchantName: true,
          amount: true,
          category: true,
          receiptDate: true,
          createdAt: true,
          fileUrl: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    } else {
      const timeframeDays: Record<string, number> = {
        "7d": 7,
        "30d": 30,
        "90d": 90,
      };
      const days = timeframeDays[timeframe] || 30;
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      receipts = await prisma.receipt.findMany({
        where: {
          userId: userIdInt,
          createdAt: { gte: sinceDate },
        },
        select: {
          id: true,
          merchantName: true,
          amount: true,
          category: true,
          receiptDate: true,
          createdAt: true,
          fileUrl: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }

    // Get last activity
    const lastActivityQuery = await prisma.auditLog.findFirst({
      where: { userId: userIdInt },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    const response = {
      user: {
        ...userInfo,
        name: `${userInfo.firstName || ""} ${userInfo.lastName || ""}`.trim(),
      },
      stats: {
        totalReceipts: userStats._count._all || 0,
        totalAmount: Number(userStats._sum.amount || 0),
        receiptsThisPeriod: periodStats.receipts_this_period,
        amountThisPeriod: periodStats.amount_this_period,
        totalReports: reportsStats._count._all || 0,
        reportsThisPeriod: reportsThisPeriod.reports_this_period,
        lastActivity: lastActivityQuery?.createdAt || null,
      },
      recentActivity:
        recentActivity.map((log) => ({
          event: log.eventType,
          created_at: log.createdAt,
          meta: log.eventData,
        })) || [],
      categoryBreakdown:
        categoryBreakdown.map((cat) => ({
          category: cat.category,
          count: cat._count._all || 0,
          total: Number(cat._sum.amount || 0),
        })) || [],
      receipts: receipts || [],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Admin user details error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
