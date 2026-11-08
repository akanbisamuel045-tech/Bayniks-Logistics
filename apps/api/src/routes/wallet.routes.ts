import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import {
  WalletTopupInitRequestSchema,
  OrderEscrowPayRequestSchema,
  PaystackWebhookEventSchema,
} from '@logistics/shared-types';
import { User, WalletTransaction } from '../models';
import { requireAuth } from '../middleware/auth.middleware';
import { getPaystackProvider, verifyPaystackSignature } from '../providers/paystack.provider';
import {
  getWalletService,
  InsufficientBalanceError,
  OrderNotFoundError,
} from '../services/wallet.service';
import { dispatchService } from '../services/dispatch.service';

export const walletRouter = Router();
export const webhookRouter = Router();

/**
 * GET /api/v1/wallet/me
 * Protected: Returns user's wallet balance, escrow balance, dedicated virtual account, and transaction ledger.
 */
walletRouter.get(
  '/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const walletService = getWalletService();
      const wallet = await walletService.getOrCreateWallet(req.user!.id);
      const recentTransactions = await WalletTransaction.find({
        walletUserId: req.user!.id,
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      res.status(200).json({
        balanceKobo: wallet.balanceKobo,
        escrowLockedKobo: wallet.escrowLockedKobo,
        paystackDedicatedAccountNumber: wallet.paystackDedicatedAccountNumber,
        paystackBankName: wallet.paystackBankName,
        recentTransactions,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/wallet/topup/initialize
 * Protected: Initializes Paystack transaction to fund user's wallet.
 */
walletRouter.post(
  '/topup/initialize',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = WalletTopupInitRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const user = await User.findById(req.user!.id);
      const paystack = getPaystackProvider();
      const reference = `PSK-TOPUP-${Date.now()}-${crypto.randomInt(1000, 9999)}`;

      const session = await paystack.initializeTransaction({
        email: user?.email || `${req.user!.phone.replace('+', '')}@logistics.ng`,
        amountKobo: parsed.data.amountKobo,
        reference,
        metadata: {
          type: 'wallet_topup',
          userId: req.user!.id,
        },
        callbackUrl: parsed.data.callbackUrl,
      });

      res.status(200).json({
        reference: session.reference,
        authorizationUrl: session.authorizationUrl,
        amountKobo: parsed.data.amountKobo,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/wallet/pay-order
 * Protected: Atomically locks order fare from wallet balance into escrow.
 */
walletRouter.post(
  '/pay-order',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = OrderEscrowPayRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const walletService = getWalletService();
      const result = await walletService.lockOrderEscrowFromWallet({
        userId: req.user!.id,
        orderId: parsed.data.orderId,
      });

      // Automatically trigger nearest-rider geospatial dispatch worker
      dispatchService.dispatchOrderToNearestRiders(parsed.data.orderId).catch(() => {});

      res.status(200).json({
        message: 'Escrow locked successfully',
        order: result.order,
        wallet: result.wallet,
      });
    } catch (error: any) {
      if (error instanceof InsufficientBalanceError) {
        res.status(402).json({
          error: error.message,
          code: error.code,
        });
        return;
      }
      if (error instanceof OrderNotFoundError) {
        res.status(404).json({
          error: error.message,
          code: error.code,
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/webhooks/paystack
 * Public webhook endpoint: Verified via HMAC SHA-512 x-paystack-signature header.
 */
webhookRouter.post(
  '/paystack',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const signature = req.headers['x-paystack-signature'];

      const isValid = verifyPaystackSignature(rawBody, signature as string);
      if (!isValid) {
        res.status(401).json({
          error: 'Invalid or forged webhook signature',
          code: 'INVALID_SIGNATURE',
        });
        return;
      }

      const parsedEvent = PaystackWebhookEventSchema.safeParse(req.body);
      if (!parsedEvent.success) {
        res.status(400).json({
          error: 'Invalid webhook payload structure',
          issues: parsedEvent.error.issues,
        });
        return;
      }

      const { event, data } = parsedEvent.data;

      if (event === 'charge.success') {
        const walletService = getWalletService();
        const { reference, amount, metadata } = data;

        if (metadata?.type === 'order_payment' && metadata?.orderId && metadata?.userId) {
          // Idempotent Topup + Escrow lock for the order
          await walletService.creditWalletIdempotent({
            userId: metadata.userId as string,
            amountKobo: amount,
            reference,
            orderId: metadata.orderId as string,
          });
          await walletService.lockOrderEscrowFromWallet({
            userId: metadata.userId as string,
            orderId: metadata.orderId as string,
          });
          dispatchService.dispatchOrderToNearestRiders(metadata.orderId as string).catch(() => {});
        } else if (metadata?.userId) {
          // Standard wallet topup
          await walletService.creditWalletIdempotent({
            userId: metadata.userId as string,
            amountKobo: amount,
            reference,
          });
        }
      }

      res.status(200).json({ status: 'success', received: true });
    } catch (error) {
      next(error);
    }
  }
);

