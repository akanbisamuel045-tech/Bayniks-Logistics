import Redis from 'ioredis';
import './env';

export function getRedisUrl(): string {
  return process.env.REDIS_URL || 'redis://127.0.0.1:6379';
}

export const DEFAULT_REDIS_URL = getRedisUrl();

let redisInstance: Redis | null = null;

export function getRedisClient(url?: string): Redis {
  if (!redisInstance) {
    const resolvedUrl = url || getRedisUrl();
    const isTls = resolvedUrl.startsWith('rediss://');

    redisInstance = new Redis(resolvedUrl, {
      maxRetriesPerRequest: 3,
      ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
      retryStrategy(times) {
        if (times > 5) {
          return null; // stop retrying
        }
        return Math.min(times * 100, 2000);
      },
    });
  }
  return redisInstance;
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}

export async function checkRedisHealth(client?: Redis): Promise<{ status: 'ok' | 'error'; details?: string }> {
  try {
    const redis = client || getRedisClient();
    const pong = await redis.ping();
    if (pong === 'PONG') {
      return { status: 'ok' };
    }
    return { status: 'error', details: `Unexpected response: ${pong}` };
  } catch (error) {
    return {
      status: 'error',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}
