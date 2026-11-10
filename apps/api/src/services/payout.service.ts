import mongoose, { Types } from 'mongoose';
import crypto from 'crypto';
import {
  OrderSplitSettlementResult,
  PayoutTransactionRecord,
} from '@logistics/shared-types';
import {
  Order,
  User,
  RiderProfile,
  Wallet,
  WalletTransaction,
  FleetSplitRule,
  PayoutTransaction,
  IPayoutTransaction,
} from '../models';
import { getPaystackProvider } from '../providers/paystack.provider';
import { InsufficientBalanceError } from './wallet.service';

export class PayoutServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'PAYOUT_SERVICE_ERROR') {
    super(message);
    this.name = 'PayoutServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class PayoutService {
  /**
   * Helper to execute operation inside a MongoDB Multi-Document ACID Transaction with retries.
   */
  private async executeInTransaction<T>(
    operation: (session: mongoose.ClientSession) => Promise<T>
  ): Promise<T> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      const session = await mongoose.startSession();
      try {
        let result!: T;
        await session.withTransaction(async () => {
          result = await operation(session);
        });
        return result;
      } catch (error: any) {
        if (error instanceof InsufficientBalanceError || error instanceof PayoutServiceError) {
          throw error;
        }

        const isTransient =
          error?.hasErrorLabel?.('TransientTransactionError') ||
          error?.code === 112 ||
          error?.message?.includes('WriteConflict');

        if (isTransient && attempt < maxRetries - 1) {
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
          continue;
        }
        throw error;
      } finally {
        await session.endSession();
      }
    }

    throw new Error('Transaction failed after maximum retries');
  }

  /**
   * Automatically executes the 80/20 platform commission and Fleet Owner revenue split
   * upon order delivery completion.
   *
   * Formula:
   * Gross Fare = 100% (e.g. ₦10,000 = 1,000,000 Kobo)
   * Platform Commission = 20% (e.g. 200,000 Kobo) -> Bayniks platform revenue
   * Net Rider Pool = 80% (e.g. 800,000 Kobo)
   *   - If rider has linked Fleet Owner:
   *       Rider Share = riderSharePercent (default 70% of pool = 560,000 Kobo)
   *       Fleet Owner Share = fleetOwnerSharePercent (default 30% of pool = 240,000 Kobo)
   *   - If independent rider:
   *       Rider Share = 100% of pool (800,000 Kobo)
   */
  async processOrderSplitSettlement(orderId: string): Promise<OrderSplitSettlementResult> {
    const oid = new Types.ObjectId(orderId);
    const order = await Order.findById(oid);
    if (!order) {
      throw new PayoutServiceError('Order not found for split settlement', 404, 'ORDER_NOT_FOUND');
    }

    if (!order.riderId) {
      throw new PayoutServiceError('Order does not have an assigned rider to settle', 400, 'NO_RIDER_ASSIGNED');
    }

    const riderUserId = order.riderId.toString();

    // 1. Fetch Rider Profile to check for Fleet Owner affiliation
    const riderProfile = await RiderProfile.findOne({ userId: order.riderId });
    const fleetOwnerId = riderProfile?.fleetOwnerId ? riderProfile.fleetOwnerId.toString() : null;

    const grossFareKobo = order.totalFareKobo;
    const platformCommissionKobo = order.platformCommissionKobo || Math.round(grossFareKobo * 0.2);
    const netRiderPoolKobo = grossFareKobo - platformCommissionKobo;

    let riderEarningsKobo = netRiderPoolKobo;
    let fleetOwnerEarningsKobo = 0;

    // 2. Compute Fleet Owner Split if applicable
    if (fleetOwnerId) {
      const splitRule = await FleetSplitRule.findOne({
        fleetOwnerId: new Types.ObjectId(fleetOwnerId),
        riderUserId: order.riderId,
      });

      const riderPercent = splitRule?.riderSharePercent ?? 70;
      const fleetPercent = splitRule?.fleetOwnerSharePercent ?? 30;

      // Golden Rule 6: Integer Kobo arithmetic (prevent floating point loss)
      riderEarningsKobo = Math.round(netRiderPoolKobo * (riderPercent / 100));
      fleetOwnerEarningsKobo = netRiderPoolKobo - riderEarningsKobo;
    }

    // 3. Golden Rule 6: Execute Atomic MongoDB Multi-Document ACID Transaction
    return this.executeInTransaction(async (session) => {
      // Idempotency guard: check if settlement transaction already executed
      const existingRiderTx = await WalletTransaction.findOne({
        reference: `EARNING-${order.trackingCode}-RIDER`,
      }).session(session);

      if (existingRiderTx) {
        return {
          orderId: order._id.toString(),
          grossFareKobo,
          platformCommissionKobo,
          riderEarningsKobo,
          fleetOwnerEarningsKobo,
          fleetOwnerId,
          settledAt: Date.now(),
        };
      }

      // Deduct from sender's escrow hold if sender paid via wallet
      if (order.paymentMethod === 'wallet') {
        await Wallet.findOneAndUpdate(
          {
            userId: order.senderId,
            escrowLockedKobo: { $gte: order.totalFareKobo },
          },
          {
            $inc: { escrowLockedKobo: -order.totalFareKobo },
          },
          { session }
        );
      }

      // Credit Rider Wallet
      await Wallet.findOneAndUpdate(
        { userId: order.riderId },
        { $inc: { balanceKobo: riderEarningsKobo } },
        { session, upsert: true, new: true }
      );

      await WalletTransaction.create(
        [
          {
            walletUserId: order.riderId,
            orderId: order._id,
            type: 'escrow_release',
            amountKobo: riderEarningsKobo,
            reference: `EARNING-${order.trackingCode}-RIDER`,
            status: 'success',
          },
        ],
        { session }
      );

      // Credit Fleet Owner Wallet if affiliated
      if (fleetOwnerId && fleetOwnerEarningsKobo > 0) {
        await Wallet.findOneAndUpdate(
          { userId: new Types.ObjectId(fleetOwnerId) },
          { $inc: { balanceKobo: fleetOwnerEarningsKobo } },
          { session, upsert: true, new: true }
        );

        await WalletTransaction.create(
          [
            {
              walletUserId: new Types.ObjectId(fleetOwnerId),
              orderId: order._id,
              type: 'escrow_release',
              amountKobo: fleetOwnerEarningsKobo,
              reference: `EARNING-${order.trackingCode}-FLEET`,
              status: 'success',
            },
          ],
          { session }
        );
      }

      // Mark Order as Settled
      (order as any).settledAt = new Date();
      (order as any).payoutStatus = 'settled';
      await order.save({ session });

      return {
        orderId: order._id.toString(),
        grossFareKobo,
        platformCommissionKobo,
        riderEarningsKobo,
        fleetOwnerEarningsKobo,
        fleetOwnerId,
        settledAt: Date.now(),
      };
    });
  }

  /**
   * Initiates a bank withdrawal from user's wallet via Paystack Transfer API.
   * Atomically debits the wallet and logs a PayoutTransaction.
   */
  async initiateWithdrawal(params: {
    userId: string;
    accountNumber: string;
    bankCode: string;
    accountName: string;
    amountKobo: number;
    reason?: string;
  }): Promise<PayoutTransactionRecord> {
    const { userId, accountNumber, bankCode, accountName, amountKobo, reason = 'Bayniks Wallet Withdrawal' } = params;

    const uid = new Types.ObjectId(userId);
    const paystack = getPaystackProvider();

    // 1. Verify recipient name via NUBAN lookup
    const resolvedAccount = await paystack.resolveAccountNumber({ accountNumber, bankCode });
    const finalAccountName = resolvedAccount.accountName || accountName;

    // 2. Create Paystack Transfer Recipient
    const recipient = await paystack.createTransferRecipient({
      name: finalAccountName,
      accountNumber,
      bankCode,
    });

    const payoutId = `PO-${Date.now()}-${crypto.randomInt(1000, 9999)}`;
    const transferReference = `TRF-REF-${Date.now()}-${crypto.randomInt(1000, 9999)}`;

    // 3. Atomically debit wallet and persist PayoutTransaction in MongoDB
    const payout = await this.executeInTransaction(async (session) => {
      // Balance Guard: User must have sufficient balance
      const updatedWallet = await Wallet.findOneAndUpdate(
        {
          userId: uid,
          balanceKobo: { $gte: amountKobo },
        },
        {
          $inc: { balanceKobo: -amountKobo },
        },
        { new: true, session }
      );

      if (!updatedWallet) {
        throw new InsufficientBalanceError(
          `Insufficient wallet balance to withdraw ${amountKobo} kobo.`
        );
      }

      // Record WalletTransaction audit entry
      await WalletTransaction.create(
        [
          {
            walletUserId: uid,
            type: 'payout',
            amountKobo,
            reference: payoutId,
            status: 'pending',
          },
        ],
        { session }
      );

      // Create PayoutTransaction
      const [newPayout] = await PayoutTransaction.create(
        [
          {
            payoutId,
            userId: uid,
            bankCode,
            accountNumber,
            accountName: finalAccountName,
            amountKobo,
            status: 'processing',
            recipientCode: recipient.recipientCode,
            paystackTransferReference: transferReference,
          },
        ],
        { session }
      );

      return newPayout!;
    });

    // 4. Initiate single transfer with Paystack
    try {
      const transferRes = await paystack.initiateTransfer({
        recipientCode: recipient.recipientCode,
        amountKobo,
        reason,
        reference: transferReference,
      });

      payout.transferCode = transferRes.transferCode;
      await payout.save();
    } catch (err) {
      console.error('[PayoutService] Paystack transfer initiation error:', err);
    }

    return {
      payoutId: payout.payoutId,
      userId: payout.userId.toString(),
      bankCode: payout.bankCode,
      bankName: payout.bankName,
      accountNumber: payout.accountNumber,
      accountName: payout.accountName,
      amountKobo: payout.amountKobo,
      status: payout.status,
      recipientCode: payout.recipientCode,
      paystackTransferReference: payout.paystackTransferReference,
      createdAt: payout.createdAt.getTime(),
    };
  }

  /**
   * Reconciles Paystack Transfer Webhooks ('transfer.success', 'transfer.failed', 'transfer.reversed').
   * Idempotent: Auto-refunds failed transfers back to the user's wallet.
   */
  async handlePaystackTransferWebhook(event: string, data: any): Promise<{ processed: boolean; status: string }> {
    const reference = data?.reference || data?.transfer_code;
    if (!reference) {
      return { processed: false, status: 'NO_REFERENCE' };
    }

    const payout = await PayoutTransaction.findOne({
      $or: [{ paystackTransferReference: reference }, { transferCode: reference }, { payoutId: reference }],
    });

    if (!payout) {
      return { processed: false, status: 'PAYOUT_NOT_FOUND' };
    }

    // 1. Success Webhook
    if (event === 'transfer.success') {
      if (payout.status === 'success') {
        return { processed: true, status: 'ALREADY_SUCCESS' };
      }

      payout.status = 'success';
      await payout.save();

      // Update associated WalletTransaction
      await WalletTransaction.findOneAndUpdate(
        { reference: payout.payoutId },
        { status: 'success' }
      );

      return { processed: true, status: 'MARKED_SUCCESS' };
    }

    // 2. Failed / Reversed Webhook -> Auto-Refund to Wallet
    if (event === 'transfer.failed' || event === 'transfer.reversed') {
      if (payout.status === 'failed' && payout.refundedAt) {
        return { processed: true, status: 'ALREADY_REFUNDED' };
      }

      await this.executeInTransaction(async (session) => {
        payout.status = 'failed';
        payout.failureReason = data?.reason || 'Transfer failed or reversed by Nigerian bank network';

        if (!payout.refundedAt) {
          // Atomically refund amountKobo to user's wallet
          await Wallet.findOneAndUpdate(
            { userId: payout.userId },
            { $inc: { balanceKobo: payout.amountKobo } },
            { session }
          );

          // Record Refund WalletTransaction
          await WalletTransaction.create(
            [
              {
                walletUserId: payout.userId,
                type: 'credit',
                amountKobo: payout.amountKobo,
                reference: `REFUND-${payout.payoutId}`,
                status: 'success',
              },
            ],
            { session }
          );

          payout.refundedAt = new Date();
        }

        await payout.save({ session });

        // Update original payout transaction status to failed
        await WalletTransaction.findOneAndUpdate(
          { reference: payout.payoutId },
          { status: 'failed' },
          { session }
        );
      });

      return { processed: true, status: 'REFUNDED_TO_WALLET' };
    }

    return { processed: false, status: 'UNHANDLED_EVENT' };
  }

  /**
   * Sets or updates a Fleet Split Rule between a fleet owner and an assigned rider.
   */
  async setFleetSplitRule(params: {
    fleetOwnerId: string;
    riderUserId: string;
    riderSharePercent: number;
    fleetOwnerSharePercent: number;
  }) {
    const { fleetOwnerId, riderUserId, riderSharePercent, fleetOwnerSharePercent } = params;

    if (riderSharePercent + fleetOwnerSharePercent !== 100) {
      throw new PayoutServiceError('Rider and Fleet Owner share percentages must sum to 100%', 400);
    }

    const rule = await FleetSplitRule.findOneAndUpdate(
      {
        fleetOwnerId: new Types.ObjectId(fleetOwnerId),
        riderUserId: new Types.ObjectId(riderUserId),
      },
      {
        riderSharePercent,
        fleetOwnerSharePercent,
      },
      { upsert: true, new: true }
    );

    return rule;
  }

  /**
   * Lists payout history for a rider or fleet owner.
   */
  async getPayoutsForUser(userId: string) {
    const uid = new Types.ObjectId(userId);
    return PayoutTransaction.find({ userId: uid }).sort({ createdAt: -1 }).limit(20).lean();
  }
}

let payoutServiceInstance: PayoutService | null = null;

export function getPayoutService(): PayoutService {
  if (!payoutServiceInstance) {
    payoutServiceInstance = new PayoutService();
  }
  return payoutServiceInstance;
}

export const payoutService = getPayoutService();

