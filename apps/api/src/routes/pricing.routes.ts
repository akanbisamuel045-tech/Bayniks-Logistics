import { Router, Request, Response, NextFunction } from 'express';
import { FareEstimateRequestSchema } from '@logistics/shared-types';
import { getMapsProvider } from '../providers/maps.provider';
import { getPricingService } from '../services/pricing.service';

export const mapsRouter = Router();
export const pricingRouter = Router();

/**
 * GET /api/v1/maps/autocomplete?q=...
 * Returns an array of PlacePrediction matching the query for Nigerian locations.
 */
mapsRouter.get(
  '/autocomplete',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const q = typeof req.query.q === 'string'
        ? req.query.q
        : typeof req.query.query === 'string'
        ? req.query.query
        : typeof req.query.input === 'string'
        ? req.query.input
        : '';

      const mapsProvider = getMapsProvider();
      const predictions = await mapsProvider.autocomplete(q);
      res.status(200).json(predictions);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/pricing/estimate
 * Validates FareEstimateRequestSchema and returns dynamic multi-stop FareEstimateResponse.
 */
pricingRouter.post(
  '/estimate',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = FareEstimateRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const pricingService = getPricingService();
      const estimate = await pricingService.calculateEstimate(parsed.data);
      res.status(200).json(estimate);
    } catch (error) {
      next(error);
    }
  }
);

