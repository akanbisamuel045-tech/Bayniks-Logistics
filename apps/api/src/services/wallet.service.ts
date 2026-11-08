import mongoose, { Types } from 'mongoose';
import { Wallet, WalletTransaction, Order, User, IWallet, IOrder } from '../models';
import { getPaystackProvider } from '../providers/paystack.provider';

export class InsufficientBalanceError extends Error {
  statusCode = 402;
  code = 'INSUFFICIENT_WALLET_BALANCE';
  constructor(message: string = 'Insufficient wallet balance to lock escrow for this order') {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

export class OrderNotFoundError extends Error {
  statusCode = 404;
  code = 'ORDER_NOT_FOUND';
  constructor(message: string = 'Order not found') {
    super(message);
    this.name = 'OrderNotFoundError';
  }
}

export class WalletService {
  /**
   * Helper to execute a callback inside a MongoDB Multi-Document ACID Transaction with retry support.
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
        // If it's a known domain logic error (e.g. Insufficient Balance, Not Found), re-throw immediately without retry
        if (error instanceof InsufficientBalanceError || error instanceof OrderNotFoundError) {
          throw error;
        }

        // Retry on TransientTransactionError or WriteConflict
        const isTransient =
          error?.hasErrorLabel?.('TransientTransactionError') ||
          error?.code === 112 ||
          error?.message?.includes('WriteConflict');

        if (isTransient && attempt < maxRetries - 1) {
          attempt++;
          // Small backoff before retrying
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
   * Gets or creates a wallet for the user, auto-provisioning dedicated virtual account if missing.
   */
  async getOrCreateWallet(userId: string | Types.ObjectId): Promise<IWallet> {
    const uid = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    let wallet = await Wallet.findOne({ userId: uid });

    if (!wallet) {
      const user = await User.findById(uid);
      const paystack = getPaystackProvider();
      const dva = await paystack.assignDedicatedVirtualAccount(
        uid.toString(),
        user?.phone || '+2348000000000',
        user?.fullName || 'Logistics Customer'
      );

      wallet = await Wallet.create({
        userId: uid,
        balanceKobo: 0,
        escrowLockedKobo: 0,
        paystackDedicatedAccountNumber: dva.accountNumber,
        paystackBankName: dva.bankName,
      });
    } else if (!wallet.paystackDedicatedAccountNumber) {
      const user = await User.findById(uid);
      const paystack = getPaystackProvider();
      const dva = await paystack.assignDedicatedVirtualAccount(
        uid.toString(),
        user?.phone || '+2348000000000',
        user?.fullName || 'Logistics Customer'
      );
      wallet.paystackDedicatedAccountNumber = dva.accountNumber;
      wallet.paystackBankName = dva.bankName;
      await wallet.save();
    }

    return wallet;
  }

  /**
   * Credits a user's wallet idempotently inside a MongoDB ACID transaction.
   * Safe against duplicate webhook replays.
   */
  async creditWalletIdempotent(params: {
    userId: string | Types.ObjectId;
    amountKobo: number;
    reference: string;
    orderId?: string | Types.ObjectId | null;
  }): Promise<{ alreadyProcessed: boolean; wallet: IWallet }> {
    const uid = typeof params.userId === 'string' ? new Types.ObjectId(params.userId) : params.userId;

    return this.executeInTransaction(async (session) => {
      // 1. Idempotency Check: check if transaction with this reference was already processed
      const existingTx = await WalletTransaction.findOne({ reference: params.reference }).session(session);
      if (existingTx && existingTx.status === 'success') {
        const currentWallet = await Wallet.findOne({ userId: uid }).session(session);
        return {
          alreadyProcessed: true,
          wallet: currentWallet!,
        };
      }

      // 2. Ensure wallet document exists inside transaction
      let wallet = await Wallet.findOne({ userId: uid }).session(session);
      if (!wallet) {
        wallet = (
          await Wallet.create(
            [
              {
                userId: uid,
                balanceKobo: 0,
                escrowLockedKobo: 0,
              },
            ],
            { session }
          )
        )[0]!;
      }

      // 3. Atomically increment wallet balance
      const updatedWallet = await Wallet.findOneAndUpdate(
        { userId: uid },
        { $inc: { balanceKobo: params.amountKobo } },
        { new: true, session }
      );

      // 4. Record successful WalletTransaction
      await WalletTransaction.create(
        [
          {
            walletUserId: uid,
            orderId: params.orderId || null,
            type: 'credit',
            amountKobo: params.amountKobo,
            reference: params.reference,
            status: 'success',
          },
        ],
        { session }
      );

      return {
        alreadyProcessed: false,
        wallet: updatedWallet!,
      };
    });
  }

  /**
   * Atomically locks order total fare from customer's wallet into escrow.
   * Uses balance guard { balanceKobo: { $gte: order.totalFareKobo } } to prevent double spending.
   */
  async lockOrderEscrowFromWallet(params: {
    userId: string | Types.ObjectId;
    orderId: string | Types.ObjectId;
  }): Promise<{ order: IOrder; wallet: IWallet }> {
    const uid = typeof params.userId === 'string' ? new Types.ObjectId(params.userId) : params.userId;
    const oid = typeof params.orderId === 'string' ? new Types.ObjectId(params.orderId) : params.orderId;

    return this.executeInTransaction(async (session) => {
      // 1. Fetch Order
      const order = await Order.findOne({ _id: oid, senderId: uid }).session(session);
      if (!order) {
        throw new OrderNotFoundError('Order not found or does not belong to user');
      }

      // If order is already paid, return existing state
      if (order.paymentStatus === 'paid') {
        const wallet = await Wallet.findOne({ userId: uid }).session(session);
        return { order, wallet: wallet! };
      }

      const totalFare = order.totalFareKobo;

      // 2. Atomic Balance Guard: Deduct from balanceKobo AND add to escrowLockedKobo
      const updatedWallet = await Wallet.findOneAndUpdate(
        {
          userId: uid,
          balanceKobo: { $gte: totalFare }, // Strict guard prevents negative balance!
        },
        {
          $inc: {
            balanceKobo: -totalFare,
            escrowLockedKobo: totalFare,
          },
        },
        { new: true, session }
      );

      if (!updatedWallet) {
        throw new InsufficientBalanceError(
          `Insufficient balance. Order total is ${totalFare} kobo.`
        );
      }

      // 3. Record Escrow Hold Transaction
      const holdReference = `ESCROW-HOLD-${order.trackingCode}`;
      await WalletTransaction.create(
        [
          {
            walletUserId: uid,
            orderId: order._id,
            type: 'escrow_hold',
            amountKobo: totalFare,
            reference: holdReference,
            status: 'success',
          },
        ],
        { session }
      );

      // 4. Update Order State to Searching Rider
      order.paymentMethod = 'wallet';
      order.paymentStatus = 'paid';
      order.status = 'searching_rider';
      await order.save({ session });

      return {
        order,
        wallet: updatedWallet,
      };
    });
  }

  /**
   * Releases escrow funds to rider upon successful delivery completion.
   */
  async releaseOrderEscrowToRider(params: {
    orderId: string | Types.ObjectId;
  }): Promise<{ success: boolean; riderWallet: IWallet }> {
    const oid = typeof params.orderId === 'string' ? new Types.ObjectId(params.orderId) : params.orderId;

    return this.executeInTransaction(async (session) => {
      const order = await Order.findById(oid).session(session);
      if (!order) {
        throw new OrderNotFoundError('Order not found');
      }

      if (!order.riderId) {
        throw new Error('Order does not have an assigned rider to pay out');
      }

      const releaseReference = `ESCROW-REL-${order.trackingCode}`;

      // Idempotency: check if release transaction already occurred
      const existingTx = await WalletTransaction.findOne({ reference: releaseReference }).session(session);
      if (existingTx) {
        const rWallet = await Wallet.findOne({ userId: order.riderId }).session(session);
        return { success: true, riderWallet: rWallet! };
      }

      // 1. Release from sender's escrow hold (if sender used wallet escrow)
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

      // 2. Ensure Rider has a Wallet
      let riderWallet = await Wallet.findOne({ userId: order.riderId }).session(session);
      if (!riderWallet) {
        riderWallet = (
          await Wallet.create(
            [
              {
                userId: order.riderId,
                balanceKobo: 0,
                escrowLockedKobo: 0,
              },
            ],
            { session }
          )
        )[0]!;
      }

      // 3. Credit rider's balance with their exact 80% earning (riderEarningKobo)
      const updatedRiderWallet = await Wallet.findOneAndUpdate(
        { userId: order.riderId },
        { $inc: { balanceKobo: order.riderEarningKobo } },
        { new: true, session }
      );

      // 4. Record Escrow Release Transaction
      await WalletTransaction.create(
        [
          {
            walletUserId: order.riderId,
            orderId: order._id,
            type: 'escrow_release',
            amountKobo: order.riderEarningKobo,
            reference: releaseReference,
            status: 'success',
          },
        ],
        { session }
      );

      return {
        success: true,
        riderWallet: updatedRiderWallet!,
      };
    });
  }

  /**
   * Refunds locked escrow balance back to sender's wallet upon order cancellation.
   */
  async refundOrderEscrowToSender(params: {
    orderId: string | Types.ObjectId;
  }): Promise<{ order: IOrder; wallet: IWallet }> {
    const oid = typeof params.orderId === 'string' ? new Types.ObjectId(params.orderId) : params.orderId;

    return this.executeInTransaction(async (session) => {
      const order = await Order.findById(oid).session(session);
      if (!order) {
        throw new OrderNotFoundError('Order not found');
      }

      const refundReference = `ESCROW-REFUND-${order.trackingCode}`;

      // 1. Atomically move locked escrow balance back to sender's active balance
      const updatedWallet = await Wallet.findOneAndUpdate(
        {
          userId: order.senderId,
          escrowLockedKobo: { $gte: order.totalFareKobo },
        },
        {
          $inc: {
            escrowLockedKobo: -order.totalFareKobo,
            balanceKobo: order.totalFareKobo,
          },
        },
        { new: true, session }
      );

      // 2. Record Refund Transaction
      await WalletTransaction.create(
        [
          {
            walletUserId: order.senderId,
            orderId: order._id,
            type: 'credit',
            amountKobo: order.totalFareKobo,
            reference: refundReference,
            status: 'success',
          },
        ],
        { session }
      );

      // 3. Mark Order as Refunded & Cancelled
      order.paymentStatus = 'refunded';
      order.status = 'cancelled';
      await order.save({ session });

      return {
        order,
        wallet: updatedWallet!,
      };
    });
  }
}

let walletServiceInstance: WalletService | null = null;

export function getWalletService(): WalletService {
  if (!walletServiceInstance) {
    walletServiceInstance = new WalletService();
  }
  return walletServiceInstance;
}

export const walletService = getWalletService();

