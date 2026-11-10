import { Router, Request, Response, NextFunction } from 'express';
import {
  WithdrawalRequestSchema,
  BankResolveRequestSchema,
  FleetSplitRuleSchema,
} from '@logistics/shared-types';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { payoutService, PayoutServiceError } from '../services/payout.service';
import { getPaystackProvider } from '../providers/paystack.provider';
import { InsufficientBalanceError } from '../services/wallet.service';
import { FleetSplitRule } from '../models';

export const payoutRouter = Router();

/**
 * GET /api/v1/payout/banks
 * Public / Protected: Lists supported Nigerian banks for payout disbursement.
 */
payoutRouter.get(
  '/banks',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paystack = getPaystackProvider();
      const banks = await paystack.listBanks();
      res.json({ banks });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/payout/resolve-account
 * Public / Protected: Resolves a NUBAN account number to verify recipient name.
 */
payoutRouter.post(
  '/resolve-account',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = BankResolveRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const paystack = getPaystackProvider();
      const result = await paystack.resolveAccountNumber(parsed.data);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/wallet/withdraw
 * Protected: Initiates automated Paystack bank withdrawal from user's wallet.
 */
payoutRouter.post(
  '/withdraw',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = WithdrawalRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const { accountNumber, bankCode, accountName, amountKobo, reason } = parsed.data;

      const payout = await payoutService.initiateWithdrawal({
        userId: req.user!.id,
        accountNumber,
        bankCode,
        accountName,
        amountKobo,
        reason,
      });

      res.status(201).json({
        message: 'Bank withdrawal initiated successfully',
        payout,
      });
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        res.status(402).json({
          error: err.message,
          code: 'INSUFFICIENT_WALLET_BALANCE',
        });
        return;
      }
      if (err instanceof PayoutServiceError) {
        res.status(err.statusCode).json({
          error: err.message,
          code: err.code,
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * GET /api/v1/wallet/payouts
 * Protected: Retrieves payout history for current user.
 */
payoutRouter.get(
  '/payouts',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payouts = await payoutService.getPayoutsForUser(req.user!.id);
      res.json({ payouts });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/fleet/split-rules
 * Protected: Fleet Owner or Admin sets revenue split ratio for a rider.
 */
payoutRouter.post(
  '/fleet/split-rules',
  requireAuth,
  requireRoles('fleet_owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = FleetSplitRuleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const { fleetOwnerId, riderUserId, riderSharePercent, fleetOwnerSharePercent } = parsed.data;

      // Authorization guard: fleet owners can only manage their own rules
      if (req.user!.role === 'fleet_owner' && fleetOwnerId !== req.user!.id) {
        res.status(403).json({
          error: 'Unauthorized: Fleet owner can only manage split rules for their own fleet',
        });
        return;
      }

      const rule = await payoutService.setFleetSplitRule({
        fleetOwnerId,
        riderUserId,
        riderSharePercent,
        fleetOwnerSharePercent,
      });

      res.status(200).json({
        message: 'Fleet split rule updated successfully',
        rule,
      });
    } catch (err) {
      if (err instanceof PayoutServiceError) {
        res.status(err.statusCode).json({
          error: err.message,
          code: err.code,
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * GET /api/v1/fleet/split-rules
 * Protected: Fleet Owner or Admin lists revenue split rules.
 */
payoutRouter.get(
  '/fleet/split-rules',
  requireAuth,
  requireRoles('fleet_owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filter = req.user!.role === 'fleet_owner' ? { fleetOwnerId: req.user!.id } : {};
      const rules = await FleetSplitRule.find(filter)
        .populate('riderUserId', 'fullName phone')
        .sort({ updatedAt: -1 })
        .lean();

      res.json({ rules });
    } catch (err) {
      next(err);
    }
  }
);

