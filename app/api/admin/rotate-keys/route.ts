import { SecureKeyStore, KeySecurityManager } from "@/lib/security";
import { badRequest, internalServerError } from "@/lib/error";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// Key rotation endpoint (admin only)
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session || !session.id || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { keyType, newKey, reason } = body;

    // Validate key type
    const validKeyTypes = ["openai", "stripe", "webhook", "auth"];
    if (!validKeyTypes.includes(keyType)) {
      return badRequest(
        "Invalid key type. Must be one of: " + validKeyTypes.join(", ")
      );
    }

    // Validate new key format
    if (!newKey || newKey.length < 10) {
      return badRequest("New key must be at least 10 characters long");
    }

    // Validate key format based on type
    switch (keyType) {
      case "openai":
        if (!newKey.startsWith("sk-")) {
          return badRequest('OpenAI key must start with "sk-"');
        }
        break;
      case "stripe":
        if (!newKey.startsWith("sk_")) {
          return badRequest('Stripe key must start with "sk_"');
        }
        break;
      case "webhook":
        if (!newKey.startsWith("whsec_")) {
          return badRequest('Webhook secret must start with "whsec_"');
        }
        break;
      case "auth":
        if (newKey.length < 32) {
          return badRequest("Auth secret must be at least 32 characters long");
        }
        break;
    }

    // Log the key rotation
    console.log(
      `[KEY_ROTATION] Admin ${session.id} rotating ${keyType} key. Reason: ${
        reason || "No reason provided"
      }`
    );

    // Rotate the key
    SecureKeyStore.rotateKey(keyType, newKey);

    // Log to security manager
    const securityManager = KeySecurityManager.getInstance();
    securityManager.logKeyUsage(keyType, "key_rotation", true);

    return NextResponse.json({
      success: true,
      message: `${keyType} key rotated successfully`,
      rotatedAt: new Date().toISOString(),
      rotatedBy: session.id,
    });
  } catch (error) {
    console.error("Key rotation error:", error);
    return internalServerError("Failed to rotate key");
  }
}

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session || !session.id || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const securityManager = KeySecurityManager.getInstance();

    // Validate all keys
    securityManager.validateKeys();

    return NextResponse.json({
      success: true,
      keyStatus: {
        openai: "valid",
        stripe: "valid",
        webhook: "valid",
        auth: "valid",
      },
      lastValidated: new Date().toISOString(),
      validatedBy: session.id,
    });
  } catch (error) {
    console.error("Key validation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        keyStatus: {
          openai: "invalid",
          stripe: "invalid",
          webhook: "invalid",
          auth: "invalid",
        },
      },
      { status: 500 }
    );
  }
}
