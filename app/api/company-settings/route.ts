import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { companySettingsSchema } from "@/validation/company-settings.validation";

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

    // Transform the data to match frontend interface (camelCase)
    const transformedSettings = settings.map(setting => ({
      id: setting.id,
      userId: setting.userId,
      companyName: setting.companyName,
      addressLine1: setting.addressLine1,
      addressLine2: setting.addressLine2,
      city: setting.city,
      state: setting.state,
      zipCode: setting.zipCode,
      country: setting.country,
      approverName: setting.approverName,
      approverEmail: setting.approverEmail,
      department: setting.department,
      costCenter: setting.costCenter,
      notes: setting.notes,
      isDefault: setting.isDefault,
      createdAt: setting.createdAt.toISOString(),
      updatedAt: setting.updatedAt.toISOString(),
    }));

    return NextResponse.json({ settings: transformedSettings });
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

    // Validate request body with Zod
    const validationResult = companySettingsSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: errors,
          message: "Please check your input data"
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // If this is set as default, remove default from other settings
    if (validatedData.is_default) {
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
    let existingSetting = null;
    
    // First, try to find by ID if provided (for updates)
    if (body.id) {
      existingSetting = await prisma.companySettings.findFirst({
        where: {
          id: body.id,
          userId: userId,
        },
      });
    }
    
    // If not found by ID, try to find by company name and user (for compatibility)
    if (!existingSetting) {
      existingSetting = await prisma.companySettings.findFirst({
        where: {
          userId: userId,
          companyName: validatedData.company_name,
        },
      });
    }

    let result;
    if (existingSetting) {
      // Update existing setting
      result = await prisma.companySettings.update({
        where: {
          id: existingSetting.id,
        },
        data: {
          companyName: validatedData.company_name,
          approverName: validatedData.approver_name,
          approverEmail: validatedData.approver_email,
          addressLine1: validatedData.address_line_1,
          addressLine2: validatedData.address_line_2,
          city: validatedData.city,
          state: validatedData.state,
          zipCode: validatedData.zip_code,
          country: validatedData.country,
          department: validatedData.department,
          costCenter: validatedData.cost_center,
          notes: validatedData.notes,
          isDefault: validatedData.is_default,
        },
      });
    } else {
      // Create new setting
      result = await prisma.companySettings.create({
        data: {
          userId,
          companyName: validatedData.company_name,
          approverName: validatedData.approver_name,
          approverEmail: validatedData.approver_email,
          addressLine1: validatedData.address_line_1,
          addressLine2: validatedData.address_line_2,
          city: validatedData.city,
          state: validatedData.state,
          zipCode: validatedData.zip_code,
          country: validatedData.country,
          department: validatedData.department,
          costCenter: validatedData.cost_center,
          notes: validatedData.notes,
          isDefault: validatedData.is_default,
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
