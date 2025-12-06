interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  ok: boolean;
  remaining: number;
  reset: number;
}

class InMemoryRateLimit {
  private cache = new Map<string, RateLimitEntry>();
  private maxSize = 10000; // Prevent memory leaks

  async check(key: string, windowMs: number, max: number): Promise<RateLimitResult> {
    const now = Date.now();
    const resetTime = now + windowMs;
    
    // Clean up expired entries
    this.cleanup(now);
    
    // Check if we need to evict old entries
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    const entry = this.cache.get(key);
    
    if (!entry || entry.resetTime <= now) {
      // New entry or expired
      this.cache.set(key, { count: 1, resetTime });
      return {
        ok: true,
        remaining: max - 1,
        reset: resetTime,
      };
    }
    
    if (entry.count >= max) {
      return {
        ok: false,
        remaining: 0,
        reset: entry.resetTime,
      };
    }
    
    // Increment count
    entry.count++;
    this.cache.set(key, entry);
    
    return {
      ok: true,
      remaining: max - entry.count,
      reset: entry.resetTime,
    };
  }
  
  private cleanup(now: number) {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.resetTime <= now) {
        this.cache.delete(key);
      }
    }
  }
  
  private evictOldest() {
    // Remove 20% of entries, starting with oldest
    const entries = Array.from(this.cache.entries());
    const toRemove = Math.floor(entries.length * 0.2);
    
    entries
      .sort((a, b) => a[1].resetTime - b[1].resetTime)
      .slice(0, toRemove)
      .forEach(([key]) => this.cache.delete(key));
  }
}

// Upstash Redis implementation
class UpstashRateLimit {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async check(key: string, windowMs: number, max: number): Promise<RateLimitResult> {
    try {
      const response = await fetch(`${this.baseUrl}/get/${key}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Upstash request failed: ${response.status}`);
      }

      const data = await response.json();
      const now = Date.now();
      const resetTime = now + windowMs;

      if (!data || data.resetTime <= now) {
        // New entry or expired
        await this.setKey(key, { count: 1, resetTime }, windowMs);
        return {
          ok: true,
          remaining: max - 1,
          reset: resetTime,
        };
      }

      if (data.count >= max) {
        return {
          ok: false,
          remaining: 0,
          reset: data.resetTime,
        };
      }

      // Increment count
      data.count++;
      await this.setKey(key, data, windowMs);

      return {
        ok: true,
        remaining: max - data.count,
        reset: data.resetTime,
      };
    } catch (error) {
      console.error("Upstash rate limit error:", error);
      // Fallback to allowing the request
      return {
        ok: true,
        remaining: max - 1,
        reset: Date.now() + windowMs,
      };
    }
  }

  private async setKey(key: string, value: RateLimitEntry, ttlMs: number) {
    const response = await fetch(`${this.baseUrl}/set/${key}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        value: JSON.stringify(value),
        ex: Math.ceil(ttlMs / 1000), // Convert to seconds
      }),
    });

    if (!response.ok) {
      throw new Error(`Upstash set failed: ${response.status}`);
    }
  }
}

// Initialize rate limiter
const rateLimiter = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new UpstashRateLimit(process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN)
  : new InMemoryRateLimit();

export async function limit(
  key: string,
  windowMs: number,
  max: number
): Promise<RateLimitResult> {
  return rateLimiter.check(key, windowMs, max);
}

// Convenience functions for common rate limits
export async function limitByUser(
  userId: number,
  route: string,
  windowMs: number,
  max: number
): Promise<RateLimitResult> {
  return limit(`user:${userId}:${route}`, windowMs, max);
}

export async function limitByIP(
  ip: string,
  route: string,
  windowMs: number,
  max: number
): Promise<RateLimitResult> {
  return limit(`ip:${ip}:${route}`, windowMs, max);
}

// Common rate limit configurations
export const RATE_LIMITS = {
  RECEIPTS_CREATE: { windowMs: 60 * 1000, max: 60 }, // 60 requests per minute
  RECEIPTS_READ: { windowMs: 60 * 1000, max: 300 }, // 300 requests per minute
  REPORTS_CREATE: { windowMs: 60 * 1000, max: 20 }, // 20 requests per minute
  OCR_PROCESS: { windowMs: 60 * 1000, max: 30 }, // 30 requests per minute
  AUTH_ATTEMPTS: { windowMs: 15 * 60 * 1000, max: 5 }, // 5 attempts per 15 minutes
  GENERAL_API: { windowMs: 60 * 1000, max: 100 }, // 100 requests per minute
} as const;
