import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes';
import { riderRouter, fleetRouter, adminRiderRouter } from './routes/rider.routes';
import { mapsRouter, pricingRouter } from './routes/pricing.routes';
import { orderRouter } from './routes/order.routes';
import { walletRouter, webhookRouter } from './routes/wallet.routes';
import { telemetryRouter } from './routes/telemetry.routes';
import { dispatchRouter } from './routes/dispatch.routes';
import { checkMongoHealth } from './config/db';
import { checkRedisHealth } from './config/redis';

export function createApp(): Express {
  const app = express();

  // Core Middleware
  app.use(cors());
  app.use(
    express.json({
      limit: '5mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // Healthcheck endpoint
  app.get('/api/v1/health', async (_req: Request, res: Response): Promise<void> => {
    const mongoHealth = await checkMongoHealth();
    const redisHealth = await checkRedisHealth();

    const isHealthy = mongoHealth.status === 'ok' && redisHealth.status === 'ok';
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      mongo: mongoHealth,
      redis: redisHealth,
      timestamp: new Date().toISOString(),
    });
  });

  // Mount Feature Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/riders', riderRouter);
  app.use('/api/v1/fleet', fleetRouter);
  app.use('/api/v1/admin', adminRiderRouter);
  app.use('/api/v1/maps', mapsRouter);
  app.use('/api/v1/pricing', pricingRouter);
  app.use('/api/v1/orders', orderRouter);
  app.use('/api/v1/wallet', walletRouter);
  app.use('/api/v1/webhooks', webhookRouter);
  app.use('/api/v1/telemetry', telemetryRouter);
  app.use('/api/v1/dispatch', dispatchRouter);

  // 404 Handler
  app.use((_req: Request, res: Response): void => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction): void => {
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal Server Error';

    if (process.env.NODE_ENV !== 'test') {
      console.error('[API Error]', err);
    }

    res.status(statusCode).json({
      error: message,
      ...(err.code ? { code: err.code } : {}),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  });

  return app;
}

