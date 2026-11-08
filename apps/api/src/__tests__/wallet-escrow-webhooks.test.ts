import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectMongo, disconnectMongo } from '../config/db';
import { getRedisClient, closeRedis } from '../config/redis';
import { User, Wallet, WalletTransaction, Order } from '../models';
import { authService } from '../services/auth.service';
import { getWalletService } from '../services/wallet.service';
import { computePaystackSignature } from '../providers/paystack.provider';

const app = createApp();

describe('Stage 7: MongoDB ACID Wallet Ledger, Escrow Locking & Webhooks', () => {
  let customerToken: string;
  let customerUserId: string;
  let riderUserId: string;
  const walletService = getWalletService();

  beforeAll(async () => {
    await connectMongo();
    await Order.deleteMany({ trackingCode: { $in: ['LGS-111111', 'LGS-222222', 'LGS-CAN001'] } });
    await User.deleteMany({ phone: { $regex: /^\+234817/ } });

    // 1. Create Verified Customer User
    const customer = await User.create({
      fullName: 'Emeka Wallet Test',
      phone: '+2348170001001',
      role: 'customer',
      isVerified: true,
      passwordHash: 'hashedpassword',
    });
    customerUserId = customer._id.toString();

    const customerTokens = await authService.createTokens({
      id: customerUserId,
      role: 'customer',
      phone: customer.phone,
      isVerified: true,
    });
    customerToken = customerTokens.accessToken;

    // 2. Create Rider User
    const rider = await User.create({
      fullName: 'Rider Payout Test',
      phone: '+2348170001002',
      role: 'rider',
      isVerified: true,
      passwordHash: 'hashedpassword',
    });
    riderUserId = rider._id.toString();
  });

  afterAll(async () => {
    await Order.deleteMany({ trackingCode: { $in: ['LGS-111111', 'LGS-222222', 'LGS-CAN001'] } });
    if (customerUserId) {
      await Wallet.deleteMany({ userId: customerUserId });
      await WalletTransaction.deleteMany({ walletUserId: customerUserId });
    }
    if (riderUserId) {
      await Wallet.deleteMany({ userId: riderUserId });
      await WalletTransaction.deleteMany({ walletUserId: riderUserId });
    }
    await User.deleteMany({ phone: { $regex: /^\+234817/ } });
    await disconnectMongo();
    await closeRedis();
  });

  // SUITE 1: HMAC SHA-512 Webhook Signature Security
  describe('Suite 1: HMAC SHA-512 Webhook Signature Security', () => {
    it('rejects forged or invalid x-paystack-signature with 401 Unauthorized', async () => {
      const webhookPayload = {
        event: 'charge.success',
        data: {
          reference: 'PSK-FORGED-9999',
          amount: 5000000, // ₦50,000
          status: 'success',
          metadata: {
            type: 'wallet_topup',
            userId: customerUserId,
          },
        },
      };

      const res = await request(app)
        .post('/api/v1/webhooks/paystack')
        .set('x-paystack-signature', 'forged_invalid_signature_hex')
        .send(webhookPayload);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_SIGNATURE');

      // Assert wallet balance was NOT credited
      const wallet = await Wallet.findOne({ userId: customerUserId });
      expect(wallet ? wallet.balanceKobo : 0).toBe(0);
    });

    it('rejects missing x-paystack-signature header with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/webhooks/paystack')
        .send({
          event: 'charge.success',
          data: { reference: 'PSK-NOSIG-1111', amount: 100000, status: 'success' },
        });

      expect(res.status).toBe(401);
    });
  });

  // SUITE 2: Webhook Top-Up & Strict Idempotency (Concurrent Double-Webhook Replay)
  describe('Suite 2: Webhook Top-Up & Strict Idempotency', () => {
    it('processes charge.success webhook and remains strictly idempotent against 3 concurrent replays', async () => {
      const topupAmountKobo = 1000000; // ₦10,000.00 = 1,000,000 kobo
      const reference = 'PSK-REF-1001-CONCURRENT';

      const webhookPayload = {
        event: 'charge.success',
        data: {
          reference,
          amount: topupAmountKobo,
          status: 'success',
          metadata: {
            type: 'wallet_topup',
            userId: customerUserId,
          },
        },
      };

      const rawJson = JSON.stringify(webhookPayload);
      const validSignature = computePaystackSignature(rawJson);

      // Replay the exact same webhook 3 times concurrently
      const responses = await Promise.all([
        request(app)
          .post('/api/v1/webhooks/paystack')
          .set('Content-Type', 'application/json')
          .set('x-paystack-signature', validSignature)
          .send(rawJson),
        request(app)
          .post('/api/v1/webhooks/paystack')
          .set('Content-Type', 'application/json')
          .set('x-paystack-signature', validSignature)
          .send(rawJson),
        request(app)
          .post('/api/v1/webhooks/paystack')
          .set('Content-Type', 'application/json')
          .set('x-paystack-signature', validSignature)
          .send(rawJson),
      ]);

      // All requests should return 200 OK
      for (const res of responses) {
        expect(res.status).toBe(200);
        expect(res.body.received).toBe(true);
      }

      // CRITICAL IDEMPOTENCY ASSERTION 1: Exactly ONE WalletTransaction record exists for reference
      const txCount = await WalletTransaction.countDocuments({ reference });
      expect(txCount).toBe(1);

      // CRITICAL IDEMPOTENCY ASSERTION 2: Wallet balance is exactly 1,000,000 kobo (never 3,000,000 kobo)
      const wallet = await Wallet.findOne({ userId: customerUserId });
      expect(wallet).not.toBeNull();
      expect(wallet!.balanceKobo).toBe(topupAmountKobo);
      expect(wallet!.balanceKobo).toBe(1000000);
    });

    it('returns wallet summary including dedicated virtual account via GET /api/v1/wallet/me', async () => {
      const res = await request(app)
        .get('/api/v1/wallet/me')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.balanceKobo).toBe(1000000);
      expect(res.body.escrowLockedKobo).toBe(0);
      expect(typeof res.body.paystackDedicatedAccountNumber).toBe('string');
      expect(res.body.paystackDedicatedAccountNumber.length).toBe(10);
      expect(res.body.paystackBankName).toContain('Wema Bank');
      expect(Array.isArray(res.body.recentTransactions)).toBe(true);
      expect(res.body.recentTransactions.length).toBeGreaterThan(0);
    });

    it('initializes topup via POST /api/v1/wallet/topup/initialize', async () => {
      const res = await request(app)
        .post('/api/v1/wallet/topup/initialize')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ amountKobo: 50000 }); // ₦500.00

      expect(res.status).toBe(200);
      expect(res.body.reference).toMatch(/^PSK-TOPUP-/);
      expect(res.body.authorizationUrl).toContain('checkout.paystack.com');
      expect(res.body.amountKobo).toBe(50000);
    });
  });

  // SUITE 3: Concurrent Race-Condition Escrow Protection (Double-Spend Prevention)
  describe('Suite 3: Concurrent Race-Condition Escrow Protection', () => {
    it('prevents double spending when 2 orders costing ₦6,000 each compete for a ₦10,000 wallet balance', async () => {
      // Customer has 1,000,000 kobo (₦10,000) from Suite 2
      // Create Order 1 costing 600,000 kobo (₦6,000)
      const order1 = await Order.create({
        trackingCode: 'LGS-111111',
        senderId: customerUserId,
        vehicleType: 'bike',
        paymentMethod: 'wallet',
        paymentStatus: 'unpaid',
        status: 'pending',
        estimatedDistanceKm: 12.0,
        totalFareKobo: 600000, // ₦6,000
        platformCommissionKobo: 120000,
        riderEarningKobo: 480000,
        pickup: {
          address: 'Ikeja',
          landmark: 'Gate',
          location: { type: 'Point', coordinates: [3.3421, 6.5933] },
          contactName: 'Tunde',
          contactPhone: '+2348170001001',
          pickupPin: '1111',
        },
        stops: [
          {
            sequenceNumber: 1,
            recipientName: 'Stop 1',
            recipientPhone: '+2348021112233',
            dropoffAddress: 'Yaba',
            dropoffLandmark: 'YabaTech',
            dropoffLocation: { type: 'Point', coordinates: [3.3712, 6.5186] },
            packageDescription: 'Books',
            deliveryPin: '2222',
            status: 'pending',
          },
        ],
      });

      // Create Order 2 costing 600,000 kobo (₦6,000)
      const order2 = await Order.create({
        trackingCode: 'LGS-222222',
        senderId: customerUserId,
        vehicleType: 'bike',
        paymentMethod: 'wallet',
        paymentStatus: 'unpaid',
        status: 'pending',
        estimatedDistanceKm: 12.0,
        totalFareKobo: 600000, // ₦6,000
        platformCommissionKobo: 120000,
        riderEarningKobo: 480000,
        pickup: {
          address: 'Ikeja',
          landmark: 'Gate',
          location: { type: 'Point', coordinates: [3.3421, 6.5933] },
          contactName: 'Tunde',
          contactPhone: '+2348170001001',
          pickupPin: '3333',
        },
        stops: [
          {
            sequenceNumber: 1,
            recipientName: 'Stop 2',
            recipientPhone: '+2348021112233',
            dropoffAddress: 'Yaba',
            dropoffLandmark: 'YabaTech',
            dropoffLocation: { type: 'Point', coordinates: [3.3712, 6.5186] },
            packageDescription: 'Clothes',
            deliveryPin: '4444',
            status: 'pending',
          },
        ],
      });

      // Fire payment for both orders concurrently (race condition test)
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/v1/wallet/pay-order')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ orderId: order1._id.toString() }),
        request(app)
          .post('/api/v1/wallet/pay-order')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ orderId: order2._id.toString() }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // CRITICAL RACE CONDITION ASSERTION:
      // Exactly ONE must succeed (200 OK) and ONE must fail with 402 Payment Required!
      expect(statuses).toEqual([200, 402]);

      const failedRes = res1.status === 402 ? res1 : res2;
      expect(failedRes.body.code).toBe('INSUFFICIENT_WALLET_BALANCE');

      // Check database state
      const updatedWallet = await Wallet.findOne({ userId: customerUserId });
      expect(updatedWallet).not.toBeNull();

      // Started with 1,000,000 kobo. One 600,000 kobo deduction was made into escrow.
      // Balance must be strictly 400,000 kobo (₦4,000.00) and Escrow locked strictly 600,000 kobo.
      expect(updatedWallet!.balanceKobo).toBe(400000);
      expect(updatedWallet!.escrowLockedKobo).toBe(600000);

      // Verify winning order was transitioned to searching_rider and paid
      const winningOrderId = res1.status === 200 ? order1._id : order2._id;
      const losingOrderId = res1.status === 402 ? order1._id : order2._id;

      const winningOrder = await Order.findById(winningOrderId);
      expect(winningOrder!.status).toBe('searching_rider');
      expect(winningOrder!.paymentStatus).toBe('paid');

      const losingOrder = await Order.findById(losingOrderId);
      expect(losingOrder!.status).toBe('pending');
      expect(losingOrder!.paymentStatus).toBe('unpaid');
    });
  });

  // SUITE 4: Full Escrow Hold -> Rider Release Lifecycle
  describe('Suite 4: Escrow Release to Rider Lifecycle', () => {
    it('releases escrow funds and credits rider earning upon delivery completion', async () => {
      // Find the paid order from Suite 3
      const paidOrder = await Order.findOne({
        senderId: customerUserId,
        paymentStatus: 'paid',
        status: 'searching_rider',
      });
      expect(paidOrder).not.toBeNull();

      // Assign rider to order
      paidOrder!.riderId = riderUserId as any;
      await paidOrder!.save();

      // Check initial rider balance
      const riderWalletBefore = await Wallet.findOne({ userId: riderUserId });
      const initialRiderBalance = riderWalletBefore ? riderWalletBefore.balanceKobo : 0;

      // Execute Escrow Release
      const releaseResult = await walletService.releaseOrderEscrowToRider({
        orderId: paidOrder!._id.toString(),
      });
      expect(releaseResult.success).toBe(true);

      // 1. Sender's locked escrow must decrease from 600,000 to 0
      const senderWallet = await Wallet.findOne({ userId: customerUserId });
      expect(senderWallet!.escrowLockedKobo).toBe(0);

      // 2. Rider's wallet must increase by exactly order.riderEarningKobo (480,000 kobo)
      const riderWalletAfter = await Wallet.findOne({ userId: riderUserId });
      expect(riderWalletAfter).not.toBeNull();
      expect(riderWalletAfter!.balanceKobo).toBe(initialRiderBalance + paidOrder!.riderEarningKobo);
      expect(riderWalletAfter!.balanceKobo).toBe(480000);

      // 3. Verify escrow release transaction record
      const releaseTx = await WalletTransaction.findOne({
        reference: `ESCROW-REL-${paidOrder!.trackingCode}`,
      });
      expect(releaseTx).not.toBeNull();
      expect(releaseTx!.type).toBe('escrow_release');
      expect(releaseTx!.amountKobo).toBe(480000);
      expect(releaseTx!.status).toBe('success');

      // 4. Test idempotency of releaseOrderEscrowToRider (calling again does NOT double pay)
      const secondRelease = await walletService.releaseOrderEscrowToRider({
        orderId: paidOrder!._id.toString(),
      });
      expect(secondRelease.success).toBe(true);

      const riderWalletAfterRepeat = await Wallet.findOne({ userId: riderUserId });
      expect(riderWalletAfterRepeat!.balanceKobo).toBe(480000); // No double payment!
    });
  });

  // SUITE 5: Escrow Refund on Order Cancellation
  describe('Suite 5: Escrow Refund on Order Cancellation', () => {
    it('refunds locked escrow back to sender balance and marks order cancelled', async () => {
      // 1. Create and pay for a new order
      const cancelOrder = await Order.create({
        trackingCode: 'LGS-CAN001',
        senderId: customerUserId,
        vehicleType: 'bike',
        paymentMethod: 'wallet',
        paymentStatus: 'unpaid',
        status: 'pending',
        estimatedDistanceKm: 5.0,
        totalFareKobo: 250000, // ₦2,500
        platformCommissionKobo: 50000,
        riderEarningKobo: 200000,
        pickup: {
          address: 'Surulere',
          landmark: 'Stadium',
          location: { type: 'Point', coordinates: [3.3615, 6.4969] },
          contactName: 'Tunde',
          contactPhone: '+2348170001001',
          pickupPin: '5555',
        },
        stops: [
          {
            sequenceNumber: 1,
            recipientName: 'Cancel Stop',
            recipientPhone: '+2348021112233',
            dropoffAddress: 'Yaba',
            dropoffLandmark: 'YabaTech',
            dropoffLocation: { type: 'Point', coordinates: [3.3712, 6.5186] },
            packageDescription: 'Return parcel',
            deliveryPin: '6666',
            status: 'pending',
          },
        ],
      });

      // Customer currently has 400,000 kobo.
      // Lock 250,000 kobo for cancelOrder:
      await walletService.lockOrderEscrowFromWallet({
        userId: customerUserId,
        orderId: cancelOrder._id.toString(),
      });

      const walletDuringLock = await Wallet.findOne({ userId: customerUserId });
      expect(walletDuringLock!.balanceKobo).toBe(150000); // 400k - 250k
      expect(walletDuringLock!.escrowLockedKobo).toBe(250000);

      // 2. Refund escrow back to sender
      const refundResult = await walletService.refundOrderEscrowToSender({
        orderId: cancelOrder._id.toString(),
      });

      expect(refundResult.order.status).toBe('cancelled');
      expect(refundResult.order.paymentStatus).toBe('refunded');

      // 3. Sender's wallet balance must be restored to 400,000 kobo and escrow locked must be 0
      const walletAfterRefund = await Wallet.findOne({ userId: customerUserId });
      expect(walletAfterRefund!.balanceKobo).toBe(400000);
      expect(walletAfterRefund!.escrowLockedKobo).toBe(0);

      // 4. Verify refund transaction record exists
      const refundTx = await WalletTransaction.findOne({
        reference: `ESCROW-REFUND-${cancelOrder.trackingCode}`,
      });
      expect(refundTx).not.toBeNull();
      expect(refundTx!.amountKobo).toBe(250000);
      expect(refundTx!.type).toBe('credit');
    });
  });
});

