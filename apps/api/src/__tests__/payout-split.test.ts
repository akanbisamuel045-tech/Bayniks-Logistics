import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectMongo, disconnectMongo } from '../config/db';
import { getRedisClient, closeRedis } from '../config/redis';
import { User, Order, RiderProfile, Wallet, WalletTransaction, FleetSplitRule, PayoutTransaction } from '../models';
import { authService } from '../services/auth.service';
import { payoutService } from '../services/payout.service';
import { computePaystackSignature } from '../providers/paystack.provider';
import { toGeoJsonPoint } from '@logistics/shared-types';

const app = createApp();

describe('Stage 19: Automated Paystack Bank Payouts & Fleet Owner 80/20 Split Settlement', () => {
  let adminToken: string;
  let adminUserId: string;

  let fleetOwnerToken: string;
  let fleetOwnerUserId: string;

  let riderFleetToken: string;
  let riderFleetUserId: string;

  let riderIndepToken: string;
  let riderIndepUserId: string;

  let customerUserId: string;

  beforeAll(async () => {
    await connectMongo();
    await User.deleteMany({ phone: { $regex: /^\+234819/ } });
    await RiderProfile.deleteMany({ plateNumber: { $in: ['EKY-901-FL', 'APP-102-SL'] } });
    await Order.deleteMany({ trackingCode: { $regex: /^LGS-PAY/ } });
    await Wallet.deleteMany({});
    await WalletTransaction.deleteMany({});
    await FleetSplitRule.deleteMany({});
    await PayoutTransaction.deleteMany({});

    // 1. Admin User
    const adminUser = await User.create({
      fullName: 'Chief Finance Officer',
      phone: '+2348190000001',
      role: 'admin',
      isVerified: true,
      passwordHash: 'hashedpassword',
    });
    adminUserId = adminUser._id.toString();
    const adminTokens = await authService.createTokens({
      id: adminUserId,
      role: 'admin',
      phone: adminUser.phone,
      isVerified: true,
    });
    adminToken = adminTokens.accessToken;

    // 2. Fleet Owner User
    const fleetOwnerUser = await User.create({
      fullName: 'Adeleke Motors Logistics',
      phone: '+2348190000002',
      role: 'fleet_owner',
      isVerified: true,
      passwordHash: 'hashedpassword',
    });
    fleetOwnerUserId = fleetOwnerUser._id.toString();
    const fleetTokens = await authService.createTokens({
      id: fleetOwnerUserId,
      role: 'fleet_owner',
      phone: fleetOwnerUser.phone,
      isVerified: true,
    });
    fleetOwnerToken = fleetTokens.accessToken;

    // 3. Fleet-Affiliated Rider
    const riderFleetUser = await User.create({
      fullName: 'Babatunde Fleet Rider',
      phone: '+2348190000003',
      role: 'rider',
      isVerified: true,
      passwordHash: 'hashedpassword',
    });
    riderFleetUserId = riderFleetUser._id.toString();
    const riderFleetTokens = await authService.createTokens({
      id: riderFleetUserId,
      role: 'rider',
      phone: riderFleetUser.phone,
      isVerified: true,
    });
    riderFleetToken = riderFleetTokens.accessToken;

    await RiderProfile.create({
      userId: riderFleetUser._id,
      plateNumber: 'EKY-901-FL',
      ridersCardNumber: 'CARD-EKY-901',
      ridersCardDocumentUrl: 'https://cdn.bayniks.com/docs/card901.pdf',
      vehicleType: 'bike',
      status: 'available',
      kycStatus: 'approved',
      fleetOwnerId: fleetOwnerUser._id,
      lastLocation: toGeoJsonPoint({ lat: 6.5244, lng: 3.3792 }),
    });

    // 4. Independent Rider (No fleet owner)
    const riderIndepUser = await User.create({
      fullName: 'Chukwuma Solo Rider',
      phone: '+2348190000004',
      role: 'rider',
      isVerified: true,
      passwordHash: 'hashedpassword',
    });
    riderIndepUserId = riderIndepUser._id.toString();
    const riderIndepTokens = await authService.createTokens({
      id: riderIndepUserId,
      role: 'rider',
      phone: riderIndepUser.phone,
      isVerified: true,
    });
    riderIndepToken = riderIndepTokens.accessToken;

    await RiderProfile.create({
      userId: riderIndepUser._id,
      plateNumber: 'APP-102-SL',
      ridersCardNumber: 'CARD-APP-102',
      ridersCardDocumentUrl: 'https://cdn.bayniks.com/docs/card102.pdf',
      vehicleType: 'bike',
      status: 'available',
      kycStatus: 'approved',
      fleetOwnerId: null,
      lastLocation: toGeoJsonPoint({ lat: 6.5244, lng: 3.3792 }),
    });

    // 5. Customer User
    const customerUser = await User.create({
      fullName: 'Folashade Sender',
      phone: '+2348190000005',
      role: 'customer',
      isVerified: true,
      passwordHash: 'hashedpassword',
    });
    customerUserId = customerUser._id.toString();
  });

  afterAll(async () => {
    await User.deleteMany({ phone: { $regex: /^\+234819/ } });
    await RiderProfile.deleteMany({ plateNumber: { $in: ['EKY-901-FL', 'APP-102-SL'] } });
    await Order.deleteMany({ trackingCode: { $regex: /^LGS-PAY/ } });
    await Wallet.deleteMany({});
    await WalletTransaction.deleteMany({});
    await FleetSplitRule.deleteMany({});
    await PayoutTransaction.deleteMany({});
    await disconnectMongo();
    await closeRedis();
  });

  // =========================================================================
  // SUITE 1: 80/20 Platform Commission & 70/30 Fleet Owner Split Settlement
  // =========================================================================
  describe('Suite 1: 80/20 Platform Commission & 70/30 Fleet Split Settlement', () => {
    it('executes atomic 80/20 platform commission and 70/30 fleet split on delivery', async () => {
      // Configure 70/30 split rule for fleet rider
      await FleetSplitRule.create({
        fleetOwnerId: fleetOwnerUserId,
        riderUserId: riderFleetUserId,
        riderSharePercent: 70,
        fleetOwnerSharePercent: 30,
      });

      // Gross Fare: ₦10,000.00 = 1,000,000 Kobo
      const grossFareKobo = 1000000;
      const order = await Order.create({
        trackingCode: 'LGS-PAY-001',
        senderId: customerUserId,
        riderId: riderFleetUserId,
        status: 'delivered',
        vehicleType: 'bike',
        paymentMethod: 'wallet',
        paymentStatus: 'paid',
        estimatedDistanceKm: 12.5,
        totalFareKobo: grossFareKobo,
        platformCommissionKobo: 200000,
        riderEarningKobo: 800000,
        pickup: {
          address: '42 Marina, Lagos Island',
          landmark: 'Marina Car Park',
          location: toGeoJsonPoint({ lat: 6.4531, lng: 3.3958 }),
          contactName: 'Folashade Sender',
          contactPhone: '+2348190000005',
          pickupPin: '1122',
        },
        stops: [
          {
            sequenceNumber: 1,
            recipientName: 'Kemi Adebayo',
            recipientPhone: '+2348021112233',
            dropoffAddress: '15 Admiralty Way, Lekki Phase 1',
            dropoffLandmark: 'Admiralty Mall',
            dropoffLocation: toGeoJsonPoint({ lat: 6.4474, lng: 3.4723 }),
            packageDescription: 'E-commerce fashion bag',
            deliveryPin: '3344',
            status: 'delivered',
          },
        ],
      });

      // Lock escrow in customer wallet
      await Wallet.findOneAndUpdate(
        { userId: customerUserId },
        { $set: { escrowLockedKobo: grossFareKobo } },
        { upsert: true }
      );

      // Execute Split Settlement
      const settlement = await payoutService.processOrderSplitSettlement(order._id.toString());

      // Assertions on returned settlement:
      // Gross: 1,000,000 kobo (₦10,000)
      // Platform 20%: 200,000 kobo (₦2,000)
      // Rider Pool 80%: 800,000 kobo (₦8,000)
      // Rider 70% of pool: 560,000 kobo (₦5,600)
      // Fleet Owner 30% of pool: 240,000 kobo (₦2,400)
      expect(settlement.grossFareKobo).toBe(1000000);
      expect(settlement.platformCommissionKobo).toBe(200000);
      expect(settlement.riderEarningsKobo).toBe(560000);
      expect(settlement.fleetOwnerEarningsKobo).toBe(240000);
      expect(settlement.riderEarningsKobo + settlement.fleetOwnerEarningsKobo).toBe(800000);

      // Verify Rider Wallet balance
      const riderWallet = await Wallet.findOne({ userId: riderFleetUserId });
      expect(riderWallet?.balanceKobo).toBe(560000);

      // Verify Fleet Owner Wallet balance
      const fleetWallet = await Wallet.findOne({ userId: fleetOwnerUserId });
      expect(fleetWallet?.balanceKobo).toBe(240000);

      // Verify Customer Escrow was deducted
      const custWallet = await Wallet.findOne({ userId: customerUserId });
      expect(custWallet?.escrowLockedKobo).toBe(0);

      // Verify Order settlement flags
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder?.payoutStatus).toBe('settled');
      expect(updatedOrder?.settledAt).toBeDefined();

      // Verify WalletTransaction ledger entries
      const riderTx = await WalletTransaction.findOne({
        reference: `EARNING-${order.trackingCode}-RIDER`,
      });
      expect(riderTx?.amountKobo).toBe(560000);
      expect(riderTx?.status).toBe('success');

      const fleetTx = await WalletTransaction.findOne({
        reference: `EARNING-${order.trackingCode}-FLEET`,
      });
      expect(fleetTx?.amountKobo).toBe(240000);
      expect(fleetTx?.status).toBe('success');

      // Idempotency: re-running settlement must NOT double credit wallets
      const repeatSettlement = await payoutService.processOrderSplitSettlement(order._id.toString());
      expect(repeatSettlement.riderEarningsKobo).toBe(560000);

      const riderWalletAfter = await Wallet.findOne({ userId: riderFleetUserId });
      expect(riderWalletAfter?.balanceKobo).toBe(560000); // Balance unchanged
    });
  });

  // =========================================================================
  // SUITE 2: Independent Rider Split Settlement (No Fleet Owner)
  // =========================================================================
  describe('Suite 2: Independent Rider Split Settlement', () => {
    it('credits full 80% net pool to independent rider with 0% fleet share', async () => {
      // Gross Fare: ₦5,000.00 = 500,000 Kobo
      const grossFareKobo = 500000;
      const order = await Order.create({
        trackingCode: 'LGS-PAY-002',
        senderId: customerUserId,
        riderId: riderIndepUserId,
        status: 'delivered',
        vehicleType: 'bike',
        paymentMethod: 'wallet',
        paymentStatus: 'paid',
        estimatedDistanceKm: 6.0,
        totalFareKobo: grossFareKobo,
        platformCommissionKobo: 100000,
        riderEarningKobo: 400000,
        pickup: {
          address: '10 Allen Avenue, Ikeja',
          landmark: 'Opebi Junction',
          location: toGeoJsonPoint({ lat: 6.5954, lng: 3.3571 }),
          contactName: 'Folashade Sender',
          contactPhone: '+2348190000005',
          pickupPin: '5566',
        },
        stops: [
          {
            sequenceNumber: 1,
            recipientName: 'Dare Olumide',
            recipientPhone: '+2348039998877',
            dropoffAddress: '24 Isaac John Street, GRA Ikeja',
            dropoffLandmark: 'Radisson Blu',
            dropoffLocation: toGeoJsonPoint({ lat: 6.5866, lng: 3.3592 }),
            packageDescription: 'Important contract documents',
            deliveryPin: '7788',
            status: 'delivered',
          },
        ],
      });

      const settlement = await payoutService.processOrderSplitSettlement(order._id.toString());

      expect(settlement.grossFareKobo).toBe(500000);
      expect(settlement.platformCommissionKobo).toBe(100000);
      expect(settlement.riderEarningsKobo).toBe(400000);
      expect(settlement.fleetOwnerEarningsKobo).toBe(0);
      expect(settlement.fleetOwnerId).toBeNull();

      const riderWallet = await Wallet.findOne({ userId: riderIndepUserId });
      expect(riderWallet?.balanceKobo).toBe(400000);
    });
  });

  // =========================================================================
  // SUITE 3: Automated Paystack Bank Withdrawal
  // =========================================================================
  describe('Suite 3: Paystack Bank Withdrawal Flow', () => {
    it('initiates bank transfer and debits wallet balance atomically', async () => {
      // Rider currently has 560,000 Kobo. Let's withdraw ₦2,000 = 200,000 Kobo
      const res = await request(app)
        .post('/api/v1/wallet/withdraw')
        .set('Authorization', `Bearer ${riderFleetToken}`)
        .send({
          accountNumber: '0123456789',
          bankCode: '058', // GTBank
          accountName: 'Babatunde Fleet Rider',
          amountKobo: 200000,
          reason: 'Weekly dispatch earnings withdrawal',
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('initiated successfully');
      expect(res.body.payout.amountKobo).toBe(200000);
      expect(res.body.payout.status).toBe('processing');
      expect(res.body.payout.recipientCode).toBeDefined();

      // Verify wallet balance debited: 560,000 - 200,000 = 360,000 Kobo
      const wallet = await Wallet.findOne({ userId: riderFleetUserId });
      expect(wallet?.balanceKobo).toBe(360000);

      // Verify PayoutTransaction recorded in DB
      const payoutTx = await PayoutTransaction.findOne({ payoutId: res.body.payout.payoutId });
      expect(payoutTx).toBeDefined();
      expect(payoutTx?.status).toBe('processing');
    });

    it('rejects withdrawal if balance is insufficient with 402 Payment Required', async () => {
      // Remaining balance: 360,000 Kobo. Attempting to withdraw 500,000 Kobo
      const res = await request(app)
        .post('/api/v1/wallet/withdraw')
        .set('Authorization', `Bearer ${riderFleetToken}`)
        .send({
          accountNumber: '0123456789',
          bankCode: '058',
          accountName: 'Babatunde Fleet Rider',
          amountKobo: 500000,
          reason: 'Excessive withdrawal',
        });

      expect(res.status).toBe(402);
      expect(res.body.code).toBe('INSUFFICIENT_WALLET_BALANCE');

      // Balance remains unchanged at 360,000 Kobo
      const wallet = await Wallet.findOne({ userId: riderFleetUserId });
      expect(wallet?.balanceKobo).toBe(360000);
    });

    it('rejects withdrawal if amount is below ₦500 minimum with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/wallet/withdraw')
        .set('Authorization', `Bearer ${riderFleetToken}`)
        .send({
          accountNumber: '0123456789',
          bankCode: '058',
          accountName: 'Babatunde Fleet Rider',
          amountKobo: 20000, // ₦200 (below ₦500 minimum)
        });

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // SUITE 4: Paystack Webhook Transfer Reconciliation & Auto-Refund
  // =========================================================================
  describe('Suite 4: Paystack Webhook Transfer Reconciliation & Auto-Refund', () => {
    it('marks payout as success when transfer.success webhook is received', async () => {
      // Find the processing payout from Suite 3
      const payout = await PayoutTransaction.findOne({
        userId: riderFleetUserId,
        status: 'processing',
      });
      expect(payout).toBeDefined();

      const webhookPayload = {
        event: 'transfer.success',
        data: {
          reference: payout!.paystackTransferReference,
          transfer_code: payout!.transferCode || 'TRF_test_success_123',
          amount: payout!.amountKobo,
          status: 'success',
        },
      };

      const rawJson = JSON.stringify(webhookPayload);
      const signature = computePaystackSignature(rawJson);

      const res = await request(app)
        .post('/api/v1/webhooks/paystack')
        .set('Content-Type', 'application/json')
        .set('x-paystack-signature', signature)
        .send(rawJson);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);

      const updatedPayout = await PayoutTransaction.findById(payout!._id);
      expect(updatedPayout?.status).toBe('success');
    });

    it('auto-refunds debited amount to user wallet when transfer.failed webhook is received', async () => {
      // Initiate a second withdrawal to test failure & auto-refund
      const withdrawRes = await request(app)
        .post('/api/v1/wallet/withdraw')
        .set('Authorization', `Bearer ${riderFleetToken}`)
        .send({
          accountNumber: '0987654321',
          bankCode: '011', // First Bank
          accountName: 'Babatunde Fleet Rider',
          amountKobo: 100000, // ₦1,000
          reason: 'Test transfer failure refund',
        });

      expect(withdrawRes.status).toBe(201);
      const payoutId = withdrawRes.body.payout.payoutId;

      // Balance was debited: 360,000 - 100,000 = 260,000 Kobo
      let wallet = await Wallet.findOne({ userId: riderFleetUserId });
      expect(wallet?.balanceKobo).toBe(260000);

      // Now simulate Paystack transfer.failed webhook
      const webhookPayload = {
        event: 'transfer.failed',
        data: {
          reference: withdrawRes.body.payout.paystackTransferReference,
          amount: 100000,
          status: 'failed',
          reason: 'Destination account is dormant or invalid',
        },
      };

      const rawJson = JSON.stringify(webhookPayload);
      const signature = computePaystackSignature(rawJson);

      const webhookRes = await request(app)
        .post('/api/v1/webhooks/paystack')
        .set('Content-Type', 'application/json')
        .set('x-paystack-signature', signature)
        .send(rawJson);

      expect(webhookRes.status).toBe(200);

      // Verify PayoutTransaction marked as failed and refunded
      const updatedPayout = await PayoutTransaction.findOne({ payoutId });
      expect(updatedPayout?.status).toBe('failed');
      expect(updatedPayout?.refundedAt).toBeDefined();
      expect(updatedPayout?.failureReason).toContain('dormant');

      // Verify wallet was atomically refunded: 260,000 + 100,000 = 360,000 Kobo
      wallet = await Wallet.findOne({ userId: riderFleetUserId });
      expect(wallet?.balanceKobo).toBe(360000);

      // Verify refund audit transaction
      const refundTx = await WalletTransaction.findOne({
        reference: `REFUND-${payoutId}`,
      });
      expect(refundTx).toBeDefined();
      expect(refundTx?.amountKobo).toBe(100000);
      expect(refundTx?.type).toBe('credit');

      // Idempotency: replay the same failure webhook and ensure NO double refund occurs
      const replayRes = await request(app)
        .post('/api/v1/webhooks/paystack')
        .set('Content-Type', 'application/json')
        .set('x-paystack-signature', signature)
        .send(rawJson);

      expect(replayRes.status).toBe(200);

      wallet = await Wallet.findOne({ userId: riderFleetUserId });
      expect(wallet?.balanceKobo).toBe(360000); // Stays at 360,000
    });
  });

  // =========================================================================
  // SUITE 5: Fleet Revenue Split Rules API
  // =========================================================================
  describe('Suite 5: Fleet Revenue Split Rules API', () => {
    it('allows fleet owner to set custom split ratio for rider (e.g. 60/40)', async () => {
      const res = await request(app)
        .post('/api/v1/payout/fleet/split-rules')
        .set('Authorization', `Bearer ${fleetOwnerToken}`)
        .send({
          fleetOwnerId: fleetOwnerUserId,
          riderUserId: riderFleetUserId,
          riderSharePercent: 60,
          fleetOwnerSharePercent: 40,
        });

      expect(res.status).toBe(200);
      expect(res.body.rule.riderSharePercent).toBe(60);
      expect(res.body.rule.fleetOwnerSharePercent).toBe(40);
    });

    it('rejects split rules where percentages do not sum to 100', async () => {
      const res = await request(app)
        .post('/api/v1/payout/fleet/split-rules')
        .set('Authorization', `Bearer ${fleetOwnerToken}`)
        .send({
          fleetOwnerId: fleetOwnerUserId,
          riderUserId: riderFleetUserId,
          riderSharePercent: 75,
          fleetOwnerSharePercent: 35, // Sum = 110
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('percentages must sum to 100%');
    });

    it('rejects non-fleet owners from modifying split rules with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/payout/fleet/split-rules')
        .set('Authorization', `Bearer ${riderFleetToken}`)
        .send({
          fleetOwnerId: fleetOwnerUserId,
          riderUserId: riderFleetUserId,
          riderSharePercent: 80,
          fleetOwnerSharePercent: 20,
        });

      expect(res.status).toBe(403);
    });

    it('allows fleet owner to list their active split rules', async () => {
      const res = await request(app)
        .get('/api/v1/payout/fleet/split-rules')
        .set('Authorization', `Bearer ${fleetOwnerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.rules)).toBe(true);
      expect(res.body.rules.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // SUITE 6: Nigerian Banks List & NUBAN Account Resolution
  // =========================================================================
  describe('Suite 6: Nigerian Banks List & NUBAN Account Resolution', () => {
    it('returns supported Nigerian commercial banks from Paystack', async () => {
      const res = await request(app).get('/api/v1/payout/banks');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.banks)).toBe(true);
      expect(res.body.banks.length).toBeGreaterThan(0);

      // Verify well-known Nigerian bank is in list
      const hasGtbankOrAccess = res.body.banks.some(
        (b: any) => b.code === '058' || b.code === '044'
      );
      expect(hasGtbankOrAccess).toBe(true);
    });

    it('resolves NUBAN account number and returns verified recipient name', async () => {
      const res = await request(app)
        .post('/api/v1/payout/resolve-account')
        .send({
          accountNumber: '0123456789',
          bankCode: '058',
        });

      expect(res.status).toBe(200);
      expect(res.body.accountNumber).toBe('0123456789');
      expect(res.body.accountName).toBeDefined();
    });

    it('rejects malformed 9-digit account number with 400 Validation Error', async () => {
      const res = await request(app)
        .post('/api/v1/payout/resolve-account')
        .send({
          accountNumber: '123456789', // 9 digits (invalid NUBAN)
          bankCode: '058',
        });

      expect(res.status).toBe(400);
    });
  });
});
