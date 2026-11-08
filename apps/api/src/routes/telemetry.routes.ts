import { Router, Request, Response } from 'express';
import {
  RiderLocationPingSchema,
  BatchTelemetryPingSchema,
} from '@logistics/shared-types';
import { requireAuth, requireVerified, requireRoles } from '../middleware/auth.middleware';
import { telemetryService } from '../services/telemetry.service';

export const telemetryRouter = Router();

/**
 * POST /api/v1/telemetry/ping
 * HTTP Fallback endpoint for live rider GPS pings when mobile WebSocket drops on 3G networks.
 * Supports single ping or offline-sync batch array.
 */
telemetryRouter.post(
  '/ping',
  requireAuth,
  requireVerified,
  requireRoles('rider'),
  async (req: Request, res: Response) => {
    const riderUserId = req.user!.id;

    // Handle batch pings for offline reconnection sync
    if (req.body && Array.isArray(req.body.pings)) {
      const parsedBatch = BatchTelemetryPingSchema.safeParse(req.body);
      if (!parsedBatch.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: parsedBatch.error.errors,
        });
      }

      const results = await telemetryService.ingestRiderBatchPings(
        riderUserId,
        parsedBatch.data.pings
      );

      return res.status(200).json({
        ok: true,
        count: results.length,
        results,
      });
    }

    // Handle single ping
    const parsedPing = RiderLocationPingSchema.safeParse(req.body);
    if (!parsedPing.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsedPing.error.errors,
      });
    }

    const result = await telemetryService.ingestRiderPing(riderUserId, parsedPing.data);
    return res.status(200).json({
      ok: true,
      result,
    });
  }
);
