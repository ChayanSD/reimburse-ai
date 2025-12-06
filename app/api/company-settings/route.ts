import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();

    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.id;
    const settings = await prisma.companySettings.findMany({
      where: {
        userId: userId,
      },
      orderBy: [
        { isDefault: "desc" },
        { companyName: "asc" },
      ],
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("GET /api/company-settings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.id;
    const body = await request.json();

    const {
      setting_name = "default",
      companyName,
      approverName,
      approverEmail,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      country = "United States",
      department,
      costCenter,
      notes,
      is_default = false,
    } = body;

    // Basic validation
    if (!companyName || !approverName || !approverEmail) {
      return NextResponse.json(
        {
          error: "Company name, approver name, and approver email are required",
        },
        { status: 400 },
      );
    }

    // If this is set as default, remove default from other settings
    if (is_default) {
      await prisma.companySettings.updateMany({
        where: {
          userId: userId,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Check if setting with this name already exists
    const existingSetting = await prisma.companySettings.findFirst({
      where: {
        userId: userId,
        companyName: setting_name,
      },
    });

    let result;
    if (existingSetting) {
      // Update existing setting
      result = await prisma.companySettings.update({
        where: {
          id: existingSetting.id,
        },
        data: {
          companyName,
          approverName,
          approverEmail,
          addressLine1,
          addressLine2,
          city,
          state,
          zipCode,
          country,
          department,
          costCenter,
          notes,
          isDefault: is_default,
        },
      });
    } else {
      // Create new setting
      result = await prisma.companySettings.create({
        data: {
          userId,
          companyName,
          approverName,
          approverEmail,
          addressLine1,
          addressLine2,
          city,
          state,
          zipCode,
          country,
          department,
          costCenter,
          notes,
          isDefault: is_default,
        },
      });
    }

    return NextResponse.json({
      success: true,
      setting: result,
      message:
        existingSetting
          ? "Setting updated successfully"
          : "Setting created successfully",
    });
  } catch (error) {
    console.error("POST /api/company-settings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.id;
    const { searchParams } = new URL(request.url);
    const settingId = searchParams.get("id");

    if (!settingId) {
      return NextResponse.json(
        { error: "Setting ID is required" },
        { status: 400 },
      );
    }

    const settingIdNum = parseInt(settingId);

    // Check if this is the only setting or if it's the default
    const setting = await prisma.companySettings.findFirst({
      where: {
        id: settingIdNum,
        userId: userId,
      },
    });

    if (!setting) {
      return NextResponse.json({ error: "Setting not found" }, { status: 404 });
    }

    // Count total settings for this user
    const totalSettings = await prisma.companySettings.count({
      where: {
        userId: userId,
      },
    });

    if (totalSettings <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the only company setting" },
        { status: 400 },
      );
    }

    // If deleting the default, make another one default
    if (setting.isDefault) {
      const nextDefaultSetting = await prisma.companySettings.findFirst({
        where: {
          userId: userId,
          id: { not: settingIdNum },
        },
        orderBy: {
          id: "asc",
        },
      });

      if (nextDefaultSetting) {
        await prisma.companySettings.update({
          where: {
            id: nextDefaultSetting.id,
          },
          data: {
            isDefault: true,
          },
        });
      }
    }

    // Delete the setting
    await prisma.companySettings.delete({
      where: {
        id: settingIdNum,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Setting deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/company-settings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
