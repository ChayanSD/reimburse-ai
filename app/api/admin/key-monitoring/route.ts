import { requireAdmin } from "@/lib/auth";
import { KeySecurityManager } from "@/lib/security";
import { internalServerError } from "@/lib/error";
import { NextRequest, NextResponse } from "next/server";

// Key monitoring dashboard (admin only)
export async function GET(request: NextRequest) {
  return requireAdmin(async () => {
    try {
      KeySecurityManager.getInstance();

      // Get key usage statistics (mock data - in production, get from monitoring service)
      const keyUsageStats = {
        openai: {
          totalRequests: 1250,
          successRate: 98.5,
          lastUsed: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
          errorRate: 1.5,
          averageResponseTime: 2.3,
        },
        stripe: {
          totalRequests: 89,
          successRate: 100,
          lastUsed: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
          errorRate: 0,
          averageResponseTime: 0.8,
        },
        webhook: {
          totalRequests: 45,
          successRate: 97.8,
          lastUsed: new Date(Date.now() - 1 * 60 * 1000).toISOString(), // 1 minute ago
          errorRate: 2.2,
          averageResponseTime: 0.5,
        },
      };

      // Get recent key events (mock data)
      const recentEvents = [
        {
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          keyType: "openai",
          operation: "vision_analysis",
          success: true,
          responseTime: 2.1,
          userId: "user_123",
        },
        {
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          keyType: "stripe",
          operation: "create_payment",
          success: true,
          responseTime: 0.9,
          userId: "user_456",
        },
        {
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          keyType: "openai",
          operation: "vision_analysis",
          success: false,
          responseTime: 5.0,
          error: "Rate limit exceeded",
          userId: "user_789",
        },
      ];

      // Get security alerts
      const securityAlerts = [
        {
          id: "alert_001",
          severity: "medium",
          type: "unusual_usage_pattern",
          message: "OpenAI API usage increased by 200% in the last hour",
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          resolved: false,
        },
        {
          id: "alert_002",
          severity: "low",
          type: "key_rotation_reminder",
          message: "Stripe key has not been rotated in 90 days",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          resolved: false,
        },
      ];

      return NextResponse.json({
        success: true,
        data: {
          keyUsageStats,
          recentEvents,
          securityAlerts,
          summary: {
            totalKeys: 4,
            activeKeys: 4,
            lastValidated: new Date().toISOString(),
            securityScore: 95,
          },
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Key monitoring error:", error);
      return internalServerError("Failed to fetch key monitoring data");
    }
  })(request);
}
