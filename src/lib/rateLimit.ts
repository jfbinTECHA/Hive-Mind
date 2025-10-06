interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: Request) => string; // Function to generate rate limit key
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();

  constructor(public options: RateLimitOptions) {}

  isRateLimited(key: string): { limited: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetTime) {
      // Reset or create new entry
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.options.windowMs,
      });
      return { limited: false, remaining: this.options.maxRequests - 1, resetTime: now + this.options.windowMs };
    }

    if (entry.count >= this.options.maxRequests) {
      return { limited: true, remaining: 0, resetTime: entry.resetTime };
    }

    entry.count++;
    return { limited: false, remaining: this.options.maxRequests - entry.count, resetTime: entry.resetTime };
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

// Global rate limiters for different endpoints
export const chatRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 50, // 50 requests per minute
  keyGenerator: (request) => {
    // Use IP address as key, fallback to a default
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    return `chat:${ip}`;
  },
});

export const memoryRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyGenerator: (request) => {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    return `memory:${ip}`;
  },
});

export const multimodalRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyGenerator: (request) => {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    return `multimodal:${ip}`;
  },
});

// Middleware function for API routes
export async function checkRateLimit(
  request: Request,
  limiter: RateLimiter
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  const key = limiter.options.keyGenerator?.(request) || 'default';
  const result = limiter.isRateLimited(key);

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': limiter.options.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };

  if (result.limited) {
    headers['Retry-After'] = Math.ceil((result.resetTime - Date.now()) / 1000).toString();
  }

  return {
    allowed: !result.limited,
    headers,
  };
}

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  chatRateLimiter.cleanup();
  memoryRateLimiter.cleanup();
  multimodalRateLimiter.cleanup();
}, 5 * 60 * 1000); // Clean up every 5 minutes