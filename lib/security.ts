
import { limit } from './rateLimit';

// Key rotation and validation
export class KeySecurityManager {
  private static instance: KeySecurityManager;
  private keyRotationLog: Map<string, { lastRotated: Date; rotationCount: number }> = new Map();
  
  // Rate limiting configurations for different key types and operations
  private readonly RATE_LIMITS = {
    OPENAI_API: { windowMs: 60 * 1000, max: 100 }, // 100 requests per minute
    STRIPE_API: { windowMs: 60 * 1000, max: 200 }, // 200 requests per minute
    WEBHOOK: { windowMs: 60 * 1000, max: 500 }, // 500 requests per minute
    AUTH_SECRET: { windowMs: 15 * 60 * 1000, max: 10 }, // 10 uses per 15 minutes
    GENERAL: { windowMs: 60 * 1000, max: 1000 }, // 1000 requests per minute
  } as const;

  static getInstance(): KeySecurityManager {
    if (!KeySecurityManager.instance) {
      KeySecurityManager.instance = new KeySecurityManager();
    }
    return KeySecurityManager.instance;
  }

  // Validate API keys format and strength
  validateKeys() {
    const issues: string[] = [];

    // OpenAI API Key validation
    if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-')) {
      issues.push('Invalid OpenAI API key format');
    }

    // Stripe Key validation (support both old and new format)
    const isLive = process.env.STRIPE_MODE === 'live';
    const stripeKey = isLive ? process.env.STRIPE_SECRET_KEY_LIVE : process.env.STRIPE_SECRET_KEY_TEST;
    const finalStripeKey = stripeKey || process.env.STRIPE_SECRET_KEY;
    
    if (finalStripeKey && !finalStripeKey.startsWith('sk_')) {
      issues.push('Invalid Stripe secret key format');
    }

    // Webhook secret validation (support both old and new format)
    const webhookSecret = isLive ? process.env.STRIPE_WEBHOOK_SECRET_LIVE : process.env.STRIPE_WEBHOOK_SECRET_TEST;
    const finalWebhookSecret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
    
    if (finalWebhookSecret && !finalWebhookSecret.startsWith('whsec_')) {
      issues.push('Invalid Stripe webhook secret format');
    }


    if (issues.length > 0) {
      throw new Error(`Security validation failed: ${issues.join(', ')}`);
    }

    return true;
  }

  // Log key usage for monitoring
  logKeyUsage(keyType: string, operation: string, success: boolean) {
    const timestamp = new Date().toISOString();
    console.log(`[KEY_USAGE] ${timestamp} - ${keyType} - ${operation} - ${success ? 'SUCCESS' : 'FAILED'}`);
  }

  // Detect suspicious key usage patterns
  async detectAnomalies(keyType: string, operation: string, userId?: number, ipAddress?: string) {
    try {
      const key = `${keyType.toUpperCase()}_${operation.toUpperCase()}`;
      const config = this.RATE_LIMITS[key as keyof typeof this.RATE_LIMITS] || this.RATE_LIMITS.GENERAL;
      
      // Create rate limiting key with context
      let rateLimitKey: string;
      if (userId) {
        rateLimitKey = `key_usage:user:${userId}:${keyType}:${operation}`;
      } else if (ipAddress) {
        rateLimitKey = `key_usage:ip:${ipAddress}:${keyType}:${operation}`;
      } else {
        rateLimitKey = `key_usage:anonymous:${keyType}:${operation}`;
      }

      // Check rate limit
      const rateLimitResult = await limit(rateLimitKey, config.windowMs, config.max);
      
      const riskFactors = [];
      let riskScore = 0;

      // Check if rate limit exceeded
      if (!rateLimitResult.ok) {
        riskFactors.push('Rate limit exceeded');
        riskScore += 50;
      } else if (rateLimitResult.remaining < config.max * 0.1) {
        // Less than 10% of requests remaining
        riskFactors.push('Approaching rate limit');
        riskScore += 10;
      }

      // Additional anomaly detection based on key type and operation
      if (keyType === 'STRIPE_API' && operation === 'webhook') {
        // Stripe webhooks should be very frequent and consistent
        if (rateLimitResult.remaining < config.max * 0.5) {
          riskFactors.push('High webhook volume');
          riskScore += 15;
        }
      }

      if (keyType === 'OPENAI_API') {
        // OpenAI API calls should be monitored for cost optimization
        if (rateLimitResult.remaining < config.max * 0.2) {
          riskFactors.push('High OpenAI API usage - monitor costs');
          riskScore += 20;
        }
      }

      // Log suspicious patterns
      if (riskScore > 30) {
        console.warn(`[SECURITY_ANOMALY] High risk detected - Key: ${keyType}, Operation: ${operation}, Risk Score: ${riskScore}, Factors: ${riskFactors.join(', ')}`);
      }

      return {
        isAnomalous: riskScore > 30,
        riskScore,
        remaining: rateLimitResult.remaining,
        reset: rateLimitResult.reset,
        recommendations: this.generateRecommendations(keyType, operation, riskScore, rateLimitResult)
      };
    } catch (error) {
      console.error('Error in anomaly detection:', error);
      // Fail securely - assume anomalous if detection fails
      return {
        isAnomalous: true,
        riskScore: 100,
        remaining: 0,
        reset: Date.now() + 60000,
        recommendations: ['Rate limiting system unavailable - blocking request for security']
      };
    }
  }

  private generateRecommendations(keyType: string, operation: string, riskScore: number, rateLimitResult: { remaining: number; reset: number }): string[] {
    const recommendations = [];

    if (riskScore > 50) {
      recommendations.push('Immediate investigation required');
      recommendations.push('Consider temporarily disabling this key type');
    } else if (riskScore > 30) {
      recommendations.push('Monitor usage patterns closely');
      recommendations.push('Review API key permissions');
    }

    if (rateLimitResult.remaining < 10) {
      recommendations.push('Rate limit approaching - consider increasing limits or optimizing usage');
    }

    switch (keyType) {
      case 'OPENAI_API':
        recommendations.push('Review OpenAI API costs and usage optimization');
        break;
      case 'STRIPE_API':
        recommendations.push('Verify webhook security and consider IP whitelisting');
        break;
      case 'AUTH_SECRET':
        recommendations.push('Consider rotating authentication secrets');
        break;
    }

    return recommendations;
  }

  // Check rate limit for key usage
  async checkKeyRateLimit(keyType: string, operation: string, userId?: number, ipAddress?: string): Promise<{ allowed: boolean; remaining: number; reset: number; reason?: string }> {
    const anomalyResult = await this.detectAnomalies(keyType, operation, userId, ipAddress);
    
    return {
      allowed: !anomalyResult.isAnomalous,
      remaining: anomalyResult.remaining,
      reset: anomalyResult.reset,
      reason: anomalyResult.isAnomalous ? 'Rate limit exceeded or anomalous behavior detected' : undefined
    };
  }

  // Get current rate limit status
  async getRateLimitStatus(keyType: string, operation: string, userId?: number, ipAddress?: string) {
    const key = `${keyType.toUpperCase()}_${operation.toUpperCase()}`;
    const config = this.RATE_LIMITS[key as keyof typeof this.RATE_LIMITS] || this.RATE_LIMITS.GENERAL;
    
    let rateLimitKey: string;
    if (userId) {
      rateLimitKey = `key_usage:user:${userId}:${keyType}:${operation}`;
    } else if (ipAddress) {
      rateLimitKey = `key_usage:ip:${ipAddress}:${keyType}:${operation}`;
    } else {
      rateLimitKey = `key_usage:anonymous:${keyType}:${operation}`;
    }

    // This would need to be implemented in the rateLimit module to get current status
    // For now, return configuration and a placeholder
    return {
      keyType,
      operation,
      config,
      currentUsage: 0, // Would need Redis lookup
      remaining: config.max,
      resetTime: Date.now() + config.windowMs
    };
  }

}

// Rate limit error class
export class RateLimitError extends Error {
  rateLimitInfo: {
    allowed: boolean;
    remaining: number;
    reset: number;
    reason?: string;
  };

  constructor(message: string, rateLimitInfo: RateLimitError['rateLimitInfo']) {
    super(message);
    this.name = 'RateLimitError';
    this.rateLimitInfo = rateLimitInfo;
  }
}

// Key access wrapper with logging
export function withKeyProtection<T>(
  keyType: string,
  operation: string,
  fn: () => Promise<T>,
  options?: { userId?: number; ipAddress?: string }
): Promise<T> {
  const securityManager = KeySecurityManager.getInstance();
  
  return securityManager.checkKeyRateLimit(keyType, operation, options?.userId, options?.ipAddress)
    .then(result => {
      if (!result.allowed) {
        const error = new RateLimitError(`Rate limit exceeded: ${result.reason}`, result);
        securityManager.logKeyUsage(keyType, operation, false);
        throw error;
      }
      
      return fn();
    })
    .then(result => {
      securityManager.logKeyUsage(keyType, operation, true);
      return result;
    })
    .catch(error => {
      securityManager.logKeyUsage(keyType, operation, false);
      throw error;
    });
}

// Secure key storage for runtime
export class SecureKeyStore {
  private static keys: Map<string, string> = new Map();
  private static encryptionKey: string;

  static initialize() {
    // Initialize with environment variables (support both old and new Stripe key format)
    this.keys.set('openai', process.env.OPENAI_API_KEY!);
    
    // Get Stripe key (prefer new format, fallback to old format)
    const isLive = process.env.STRIPE_MODE === 'live';
    const stripeKey = isLive ? process.env.STRIPE_SECRET_KEY_LIVE : process.env.STRIPE_SECRET_KEY_TEST;
    const finalStripeKey = stripeKey || process.env.STRIPE_SECRET_KEY;
    if (finalStripeKey) {
      this.keys.set('stripe', finalStripeKey);
    }
    
    // Get webhook secret (prefer new format, fallback to old format)
    const webhookSecret = isLive ? process.env.STRIPE_WEBHOOK_SECRET_LIVE : process.env.STRIPE_WEBHOOK_SECRET_TEST;
    const finalWebhookSecret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
    if (finalWebhookSecret) {
      this.keys.set('webhook', finalWebhookSecret);
    }
    
    this.keys.set('auth', process.env.AUTH_SECRET!);
  }

  static getKey(keyName: string): string {
    const key = this.keys.get(keyName);
    if (!key) {
      throw new Error(`Key ${keyName} not found`);
    }
    return key;
  }

  // Rotate keys at runtime (for production key rotation)
  static rotateKey(keyName: string, newKey: string) {
    this.keys.set(keyName, newKey);
    console.log(`[SECURITY] Key ${keyName} rotated successfully`);
  }

  // Clear sensitive data from memory
  static clearKeys() {
    this.keys.clear();
    console.log('[SECURITY] All keys cleared from memory');
  }
}

// Utility functions for common rate limiting scenarios
export const SecurityRateLimitUtils = {
  // Rate limit OpenAI API usage
  async checkOpenAIRateLimit(userId?: number, ipAddress?: string) {
    const securityManager = KeySecurityManager.getInstance();
    return securityManager.checkKeyRateLimit('OPENAI_API', 'chat_completion', userId, ipAddress);
  },

  // Rate limit Stripe API usage
  async checkStripeRateLimit(operation: string, userId?: number, ipAddress?: string) {
    const securityManager = KeySecurityManager.getInstance();
    return securityManager.checkKeyRateLimit('STRIPE_API', operation, userId, ipAddress);
  },

  // Rate limit webhook processing
  async checkWebhookRateLimit(ipAddress?: string) {
    const securityManager = KeySecurityManager.getInstance();
    return securityManager.checkKeyRateLimit('WEBHOOK', 'process', undefined, ipAddress);
  },

  // Rate limit authentication operations
  async checkAuthRateLimit(userId?: number, ipAddress?: string) {
    const securityManager = KeySecurityManager.getInstance();
    return securityManager.checkKeyRateLimit('AUTH_SECRET', 'authentication', userId, ipAddress);
  },

  // Get rate limit status for monitoring
  async getKeyUsageStats(keyType: string, operation: string, userId?: number, ipAddress?: string) {
    const securityManager = KeySecurityManager.getInstance();
    return securityManager.getRateLimitStatus(keyType, operation, userId, ipAddress);
  }
};

// Initialize secure key store
SecureKeyStore.initialize();
