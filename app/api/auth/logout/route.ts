import { NextResponse } from "next/server";
import { deleteSession, clearSessionCookie } from "@/lib/session";

export async function POST() : Promise<NextResponse> {
  try {
    await deleteSession();
    await clearSessionCookie();

    return NextResponse.json(
      { message: "Logout successful" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}