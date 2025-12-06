import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { 
  unauthorized, 
  handleValidationError, 
  handleDatabaseError, 
} from "@/lib/error";
import { deleteSession } from "@/lib/session";

const accountDeleteSchema = z.object({
  confirm: z.literal("DELETE", { 
    message: "Confirmation must be exactly 'DELETE'" 
  }),
});

type AccountDeleteRequest = z.infer<typeof accountDeleteSchema>;

interface AuthUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'ADMIN' | 'USER';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get session using the project's authentication system
    const session = await getSession();
    
    if (!session) {
      return unauthorized("Authentication required");
    }

    // Parse and validate request body
    let body: AccountDeleteRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate confirmation
    const validation = accountDeleteSchema.safeParse(body);
    if (!validation.success) {
      return handleValidationError(validation.error);
    }

    const userId = session.id;

    // Verify user exists in database
    let user: AuthUser | null;
    try {
      user = await prisma.authUser.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      return handleDatabaseError(error as Error);
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Perform cascading delete using Prisma transactions
    // Prisma will handle the foreign key constraints automatically
    try {
      await prisma.$transaction(async (tx) => {
        // The order matters - we need to delete dependent records first
        // However, with proper cascade relationships in Prisma, 
        // we can just delete the user and Prisma will handle the rest
        
        // Delete related records manually to ensure clean deletion
        await tx.receiptItem.deleteMany({
          where: {
            receipt: {
              userId: userId,
            },
          },
        });

        await tx.receipt.deleteMany({
          where: { userId: userId },
        });

        await tx.report.deleteMany({
          where: { userId: userId },
        });

        await tx.companySettings.deleteMany({
          where: { userId: userId },
        });

        await tx.auditLog.deleteMany({
          where: { userId: userId },
        });

        await tx.subscriptionUsage.deleteMany({
          where: { userId: userId },
        });

        await tx.subscriptionEvent.deleteMany({
          where: { userId: userId },
        });

        await tx.referralTracking.deleteMany({
          where: {
            OR: [
              { referrerId: userId },
              { referredId: userId },
            ],
          },
        });

        // Finally, delete the user
        await tx.authUser.delete({
          where: { id: userId },
        });
      });

      // Clear the session after successful deletion
      await deleteSession();

      const userDisplayName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.email;

      console.log(`User ${userDisplayName} (ID: ${userId}, Email: ${user.email}) and all associated data deleted successfully`);

      return NextResponse.json({ 
        success: true, 
        message: "Account and all associated data have been permanently deleted" 
      });

    } catch (error) {
      console.error("Error during account deletion transaction:", error);
      return handleDatabaseError(error as Error);
    }

  } catch (error) {
    console.error("POST /api/account/delete error:", error);
    return handleDatabaseError(error as Error);
  }
}
