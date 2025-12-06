import { NextResponse } from "next/server";
import { ZodError, ZodIssue } from "zod";

interface StripeError extends Error {
  type: string;
}

// Standardized error response helpers
export interface ErrorResponse {
  error: string;
  fieldErrors?: Record<string, string>;
}

export function badRequest(message: string, fieldErrors?: Record<string, string>): NextResponse {
  return NextResponse.json({ error: message, fieldErrors }, { status: 400 });
}

export function unauthorized(message: string = "Unauthorized"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message: string = "Forbidden"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message: string = "Not found"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function rateLimited(message: string = "Rate limit exceeded", reset?: number): NextResponse {
  const response = NextResponse.json({ 
    error: message,
    ...(reset && { reset })
  }, { status: 429 });
  
  if (reset) {
    response.headers.set("Retry-After", Math.ceil((reset - Date.now()) / 1000).toString());
  }
  
  return response;
}

export function paymentRequired(message: string, metadata?: { upgradeRequired?: string; currentTier?: string }): NextResponse {
  return NextResponse.json(
    { 
      error: message,
      code: "SUBSCRIPTION_LIMIT_REACHED",
      metadata: metadata || undefined,
      timestamp: new Date().toISOString()
    },
    { status: 402 }
  );
}

// Specialized subscription limit handler for better frontend integration
export function subscriptionLimitReached(
  limitType: string, 
  currentUsage: number, 
  limit: number, 
  upgradeUrl?: string
): NextResponse {
  const response = NextResponse.json(
    {
      success: false,
      error: `${limitType} limit reached (${currentUsage}/${limit}). Upgrade to Pro for unlimited ${limitType.toLowerCase()}.`,
      code: "SUBSCRIPTION_LIMIT_REACHED",
      data: {
        limitType,
        currentUsage,
        limit,
        upgradeRequired: "pro",
        currentTier: "free",
        upgradeUrl: upgradeUrl || "/plans"
      },
      timestamp: new Date().toISOString()
    },
    { status: 402 }
  );
  
  return response;
}

export function internalServerError(message: string = "Internal Server Error"): NextResponse {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function conflict(message: string = "Conflict"): NextResponse {
  return NextResponse.json({ error: message }, { status: 409 });
}

// Helper to handle Zod validation errors
export function handleValidationError(error: ZodError): NextResponse {
  if (error.issues) {
    const fieldErrors: Record<string, string> = {};
    error.issues.forEach((issue: ZodIssue) => {
      const path = issue.path.join(".");
      fieldErrors[path] = issue.message;
    });
    return badRequest("Validation failed", fieldErrors);
  }
  return badRequest("Invalid input");
}

// Helper to handle database errors
export function handleDatabaseError(error: Error): NextResponse {
  console.error("Database error:", error);
  
  if (error.message?.includes("duplicate key")) {
    return conflict("Resource already exists");
  }
  
  if (error.message?.includes("foreign key")) {
    return badRequest("Invalid reference");
  }
  
  if (error.message?.includes("invalid input syntax")) {
    return badRequest("Invalid data format");
  }
  
  return internalServerError("Database operation failed");
}

// Helper to handle Stripe errors
export function handleStripeError(error: StripeError): NextResponse {
  console.error("Stripe error:", error);
  
  if (error.type === "StripeCardError") {
    return badRequest("Payment method declined");
  }
  
  if (error.type === "StripeRateLimitError") {
    return rateLimited("Payment service rate limited");
  }
  
  return internalServerError("Payment processing failed");
}
