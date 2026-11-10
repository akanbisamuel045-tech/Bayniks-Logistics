import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { getRedisClient } from '../config/redis';

export const healthRouter = Router();

const processStartTime = Date.now();

/**
 * GET /api/v1/health/live
 * Fast, lightweight liveness probe for Kubernetes / Docker / load balancers.
 */
healthRouter.get('/live', (_req: Request, res: Response): void => {
  res.status(200).json({
    ok: true,
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - processStartTime) / 1000),
  });
});

/**
 * GET /api/v1/health/ready
 * Deep readiness probe that pings MongoDB (rs0) and Redis RAM, measures round-trip
 * latencies in milliseconds, queries the live geo-pool count, and returns 503 if any dependency is down.
 */
healthRouter.get('/ready', async (_req: Request, res: Response): Promise<void> => {
  let mongoUp = false;
  let mongoLatencyMs = -1;
  let mongoDetails: string | undefined;

  let redisUp = false;
  let redisLatencyMs = -1;
  let redisDetails: string | undefined;

  let availableRidersInGeoPool = 0;

  // 1. Probe MongoDB (Golden Rule 6 requirement: rs0 replica set)
  try {
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      const start = Date.now();
      const ping = await mongoose.connection.db.admin().ping();
      mongoLatencyMs = Math.max(0, Date.now() - start);
      if (ping && ping.ok === 1) {
        mongoUp = true;
      }
    } else {
      mongoDetails = `MongoDB connection state is ${mongoose.connection.readyState}`;
    }
  } catch (err: any) {
    mongoDetails = err.message || 'MongoDB ping failed';
  }

  // 2. Probe Redis 7 RAM (Golden Rule 4 & 5 requirement: sub-15ms fast path)
  try {
    const redis = getRedisClient();
    const start = Date.now();
    const pong = await redis.ping();
    redisLatencyMs = Math.max(0, Date.now() - start);

    if (pong === 'PONG') {
      redisUp = true;
      // Query current active riders in Redis Geo pool
      try {
        availableRidersInGeoPool = await redis.zcard('riders:available:locations');
      } catch {
        availableRidersInGeoPool = 0;
      }
    } else {
      redisDetails = `Unexpected Redis response: ${pong}`;
    }
  } catch (err: any) {
    redisDetails = err.message || 'Redis ping failed';
  }

  const isReady = mongoUp && redisUp;
  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    ok: isReady,
    status: isReady ? 'ready' : 'unavailable',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      mongodb: {
        status: mongoUp ? 'up' : 'down',
        latencyMs: mongoLatencyMs,
        ...(mongoDetails ? { details: mongoDetails } : {}),
      },
      redis: {
        status: redisUp ? 'up' : 'down',
        latencyMs: redisLatencyMs,
        ...(redisDetails ? { details: redisDetails } : {}),
      },
    },
    fleetSummary: {
      availableRidersInGeoPool,
    },
  });
});
