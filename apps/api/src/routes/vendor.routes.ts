import { Router, Request, Response, NextFunction } from 'express';
import {
  VendorBatchEstimateRequestSchema,
  VendorBatchCreateRequestSchema,
} from '@logistics/shared-types';
import { requireAuth, requireVerified, requireRoles } from '../middleware/auth.middleware';
import { vendorService } from '../services/vendor.service';
import { InsufficientBalanceError } from '../services/wallet.service';

export const vendorRouter = Router();

/**
 * POST /api/v1/vendor/parse-csv
 * Public / Protected utility to parse and validate CSV text in memory.
 */
vendorRouter.post(
  '/parse-csv',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { csvText } = req.body;
      if (typeof csvText !== 'string' || !csvText.trim()) {
        res.status(400).json({ error: 'csvText string is required in request body' });
        return;
      }

      const result = vendorService.parseAndValidateVendorCsv(csvText);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/vendor/batch-estimate
 * Protected: Computes batch fare preview grouped by motorcycle runs.
 */
vendorRouter.post(
  '/batch-estimate',
  requireAuth,
  requireVerified,
  requireRoles('vendor', 'customer', 'admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = VendorBatchEstimateRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const { pickup, rows } = parsed.data;
      const summary = await vendorService.estimateBatchFares(pickup, rows);

      res.json(summary);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/vendor/batch-create
 * Protected: Atomically creates orders, checks wallet balance, locks escrow,
 * and triggers dispatch.
 */
vendorRouter.post(
  '/batch-create',
  requireAuth,
  requireVerified,
  requireRoles('vendor', 'customer', 'admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = VendorBatchCreateRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const { pickup, rows, paymentMethod } = parsed.data;
      const result = await vendorService.createBatchOrders(
        req.user!.id,
        pickup,
        rows,
        paymentMethod
      );

      res.status(201).json({
        message: 'Bulk batch orders created and dispatched successfully',
        summary: result,
      });
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        res.status(402).json({
          error: err.message,
          code: 'INSUFFICIENT_WALLET_BALANCE',
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * GET /api/v1/vendor/orders
 * Protected: Retrieves vendor manifest orders with live assigned rider telemetry.
 */
vendorRouter.get(
  '/orders',
  requireAuth,
  requireVerified,
  requireRoles('vendor', 'customer', 'admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orders = await vendorService.getVendorOrders(req.user!.id);
      res.json({ orders });
    } catch (err) {
      next(err);
    }
  }
);
