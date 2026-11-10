import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getRedisClient } from '../config/redis';

export interface RateLimiterOptions {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix?: string;
  skipInTest?: boolean;
}

/**
 * Creates a sliding-window rate limiter powered by Redis Sorted Sets (ZSET).
 * Provides precise sub-second window sliding without the boundary burst problem of fixed windows.
 */
export function createRedisRateLimiter(options: RateLimiterOptions) {
  const { windowSeconds, maxRequests, keyPrefix = 'rl', skipInTest = false } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // If running in test environment and skipInTest is explicitly enabled
    if (skipInTest && process.env.NODE_ENV === 'test') {
      return next();
    }

    // Identify client by authenticated user ID or remote IP address
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const userId = (req as any).user?.id || 'anon';
    const identifier = `${userId}:${clientIp}`;
    const redisKey = `ratelimit:${keyPrefix}:${identifier}`;

    try {
      const redis = getRedisClient();
      const now = Date.now();
      const windowStart = now - windowSeconds * 1000;
      const memberId = `${now}:${crypto.randomBytes(4).toString('hex')}`;

      // Execute atomic sliding window transaction in Redis
      const pipeline = redis.multi();
      pipeline.zremrangebyscore(redisKey, 0, windowStart);
      pipeline.zadd(redisKey, now, memberId);
      pipeline.zcard(redisKey);
      pipeline.expire(redisKey, windowSeconds + 2);

      const results = await pipeline.exec();
      if (!results) {
        return next();
      }

      // results[2] is zcard output: [error, count]
      const currentCount = ((results[2]?.[1] as number) ?? 1);
      const remaining = Math.max(0, maxRequests - currentCount);

      // Set standard RFC rate-limiting headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowSeconds * 1000) / 1000).toString());

      if (currentCount > maxRequests) {
        res.setHeader('Retry-After', windowSeconds.toString());
        res.status(429).json({
          error: `Too many requests. Limit is ${maxRequests} requests per ${windowSeconds}s.`,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfterSeconds: windowSeconds,
        });
        return;
      }

      next();
    } catch (err) {
      // Graceful degradation: if Redis fails, permit request rather than blocking legitimate users
      console.error('[RateLimiter] Redis error, bypassing limit check:', err);
      next();
    }
  };
}
