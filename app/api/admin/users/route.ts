import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Fetch users with basic info
    const users = await prisma.authUser.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        createdAt: true,
        _count: {
          select: {
            receipts: true,
            reports: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform data for frontend
    const transformedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.lastName || user.email,
      role: user.role,
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      createdAt: user.createdAt,
      receiptsCount: user._count.receipts,
      reportsCount: user._count.reports,
    }));

    return NextResponse.json({
      success: true,
      users: transformedUsers,
    });

  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}