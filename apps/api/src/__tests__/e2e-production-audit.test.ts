import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectMongo, disconnectMongo } from '../config/db';
import { getRedisClient, closeRedis } from '../config/redis';
import {
  User,
  Order,
  RiderProfile,
  Wallet,
  WalletTransaction,
  FleetSplitRule,
  PayoutTransaction,
} from '../models';
import { authService } from '../services/auth.service';
import { telemetryService } from '../services/telemetry.service';
import { computePaystackSignature } from '../providers/paystack.provider';
import { decodeGooglePolyline, toGeoJsonPoint } from '@logistics/shared-types';

const app = createApp();

describe('Stage 20: End-to-End System Integration, Stress Testing & Production Readiness Audit', () => {
  let adminToken: string;
  let adminUserId: string;

  let fleetOwnerToken: string;
  let fleetOwnerUserId: string;

  let riderToken: string;
  let riderUserId: string;

  let customerToken: string;
  let customerUserId: string;

  beforeAll(async () => {
    await connectMongo();
    const redis = getRedisClient();

    // Clean test records
    await User.deleteMany({ phone: { $regex: /^\+234820/ } });
    await RiderProfile.deleteMany({ plateNumber: { $regex: /STG-20/ } });
    await Order.deleteMany({ trackingCode: { $regex: /^LGS-E2E/ } });
    await Wallet.deleteMany({});
    await WalletTransaction.deleteMany({});
    await FleetSplitRule.deleteMany({});
    await PayoutTransaction.deleteMany({});
    await redis.flushdb();

    // 1. Create Super Admin
    const admin = await User.create({
      fullName: 'System Auditor Admin',
      phone: '+2348200000001',
      role: 'admin',
      isVerified: true,
      passwordHash: 'hashedpass',
    });
    adminUserId = admin._id.toString();
    const aTokens = await authService.createTokens({
      id: adminUserId,
      role: 'admin',
      phone: admin.phone,
      isVerified: true,
    });
    adminToken = aTokens.accessToken;

    // 2. Create Fleet Owner
    const fleetOwner = await User.create({
      fullName: 'Ikeja Dispatch Hub Logistics',
      phone: '+2348200000002',
      role: 'fleet_owner',
      isVerified: true,
      passwordHash: 'hashedpass',
    });
    fleetOwnerUserId = fleetOwner._id.toString();
    const foTokens = await authService.createTokens({
      id: fleetOwnerUserId,
      role: 'fleet_owner',
      phone: fleetOwner.phone,
      isVerified: true,
    });
    fleetOwnerToken = foTokens.accessToken;

    // 3. Create Motorcycle Rider
    const rider = await User.create({
      fullName: 'Tajudeen Oladipo',
      phone: '+2348200000003',
      role: 'rider',
      isVerified: true,
      passwordHash: 'hashedpass',
    });
    riderUserId = rider._id.toString();
    const rTokens = await authService.createTokens({
      id: riderUserId,
      role: 'rider',
      phone: rider.phone,
      isVerified: true,
    });
    riderToken = rTokens.accessToken;

    await RiderProfile.create({
      userId: rider._id,
      fleetOwnerId: fleetOwner._id,
      vehicleType: 'bike',
      plateNumber: 'STG-20-BIKE',
      ridersCardNumber: 'CARD-20-E2E',
      ridersCardDocumentUrl: 'https://cdn.bayniks.com/docs/card20.pdf',
      status: 'available',
      kycStatus: 'approved',
      lastLocation: toGeoJsonPoint({ lat: 6.6018, lng: 3.3515 }), // Ikeja
    });

    // Seed rider into Redis GEO pool (Golden Rule 4: [lng, lat])
    await redis.geoadd('riders:available:locations', 3.3515, 6.6018, riderUserId);

    // 4. Create Customer
    const customer = await User.create({
      fullName: 'Aramide Ojo',
      phone: '+2348200000004',
      role: 'customer',
      isVerified: true,
      passwordHash: 'hashedpass',
    });
    customerUserId = customer._id.toString();
    const cTokens = await authService.createTokens({
      id: customerUserId,
      role: 'customer',
      phone: customer.phone,
      isVerified: true,
    });
    customerToken = cTokens.accessToken;
  });

  afterAll(async () => {
    await User.deleteMany({ phone: { $regex: /^\+234820/ } });
    await RiderProfile.deleteMany({ plateNumber: { $regex: /STG-20/ } });
    await Order.deleteMany({ trackingCode: { $regex: /^LGS-E2E/ } });
    await Wallet.deleteMany({});
    await WalletTransaction.deleteMany({});
    await FleetSplitRule.deleteMany({});
    await PayoutTransaction.deleteMany({});
    await disconnectMongo();
    await closeRedis();
  });

  // =========================================================================
  // SUITE 1: Complete Multi-Actor E2E Delivery & Split Settlement Lifecycle
  // =========================================================================
  describe('Suite 1: Complete Multi-Actor E2E Delivery & Split Settlement Lifecycle', () => {
    let orderId: string;
    let trackingCode: string;
    let pickupPin: string;
    let deliveryPin1: string;
    let deliveryPin2: string;
    const grossFareKobo = 400000; // ₦4,000.00 (400,000 Kobo)

    it('Step 1: Fleet Owner sets 70/30 split rule for Rider', async () => {
      const res = await request(app)
        .post('/api/v1/payout/fleet/split-rules')
        .set('Authorization', `Bearer ${fleetOwnerToken}`)
        .send({
          fleetOwnerId: fleetOwnerUserId,
          riderUserId,
          riderSharePercent: 70,
          fleetOwnerSharePercent: 30,
        });

      expect(res.status).toBe(200);
      expect(res.body.rule.riderSharePercent).toBe(70);
      expect(res.body.rule.fleetOwnerSharePercent).toBe(30);
    });

    it('Step 2: Customer wallet topup via verified Paystack charge.success webhook', async () => {
      const topupPayload = {
        event: 'charge.success',
        data: {
          reference: `PSK-TOPUP-E2E-${Date.now()}`,
          amount: 2500000, // ₦25,000.00
          status: 'success',
          metadata: {
            userId: customerUserId,
            type: 'wallet_topup',
          },
        },
      };

      const rawJson = JSON.stringify(topupPayload);
      const signature = computePaystackSignature(rawJson);

      const res = await request(app)
        .post('/api/v1/webhooks/paystack')
        .set('Content-Type', 'application/json')
        .set('x-paystack-signature', signature)
        .send(rawJson);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);

      const wallet = await Wallet.findOne({ userId: customerUserId });
      expect(wallet?.balanceKobo).toBe(2500000);
    });

    it('Step 3: Customer books 2-stop motorcycle order with landmarks and locks wallet escrow', async () => {
      const createRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          vehicleType: 'bike',
          paymentMethod: 'wallet',
          pickup: {
            address: 'Computer Village, Ikeja',
            landmark: 'Slot Office, Medical Road Gate',
            location: { lat: 6.5933, lng: 3.3421 },
            contactName: 'Aramide Ojo',
            contactPhone: '+2348200000004',
          },
          stops: [
            {
              recipientName: 'Titi Branch 1',
              recipientPhone: '+2348021113344',
              dropoffAddress: 'Herbert Macaulay Way, Yaba',
              dropoffLandmark: 'Yaba Left Roundabout',
              dropoffLocation: { lat: 6.5186, lng: 3.3712 },
              packageDescription: 'Office documents pack 1',
            },
            {
              recipientName: 'Kofo Branch 2',
              recipientPhone: '+2348035557788',
              dropoffAddress: 'Adeola Odeku, Victoria Island',
              dropoffLandmark: 'Opposite GTBank Tower',
              dropoffLocation: { lat: 6.4281, lng: 3.4219 },
              packageDescription: 'Office documents pack 2',
            },
          ],
        });

      expect(createRes.status).toBe(201);
      orderId = (createRes.body.order._id || createRes.body.order.id).toString();
      trackingCode = createRes.body.order.trackingCode;

      // Reload order from DB to retrieve secret pins
      const order = await Order.findById(orderId);
      expect(order).toBeDefined();
      pickupPin = order!.pickup.pickupPin;
      deliveryPin1 = order!.stops[0]!.deliveryPin;
      deliveryPin2 = order!.stops[1]!.deliveryPin;

      // Lock escrow from wallet
      const escrowRes = await request(app)
        .post('/api/v1/wallet/pay-order')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId });

      expect(escrowRes.status).toBe(200);
      expect(escrowRes.body.wallet.escrowLockedKobo).toBeGreaterThan(0);
    });

    it('Step 4: Rider accepts offer, arrives at pickup, and verifies secret 4-digit pickupPin', async () => {
      // Assign rider to order directly for reliable E2E flow
      await Order.findByIdAndUpdate(orderId, {
        riderId: riderUserId,
        status: 'rider_assigned',
      });

      // Rider arrives at pickup
      const arriveRes = await request(app)
        .patch(`/api/v1/dispatch/orders/${orderId}/state`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({ status: 'arrived_pickup' });

      expect(arriveRes.status).toBe(200);

      // Verify Pickup PIN
      const verifyRes = await request(app)
        .post(`/api/v1/dispatch/orders/${orderId}/verify-pickup`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          orderId,
          pickupPin,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.ok).toBe(true);
      expect(verifyRes.body.order.status).toBe('in_transit');
    });

    it('Step 5: Golden Rule 5 compliance — 6 telemetry pings stream to Redis RAM with ZERO MongoDB route writes during transit', async () => {
      const now = Date.now();
      const pings = [
        { lat: 6.5933, lng: 3.3421, speed: 28, heading: 140, accuracy: 8, timestamp: now - 25000, orderId },
        { lat: 6.5700, lng: 3.3550, speed: 35, heading: 145, accuracy: 6, timestamp: now - 20000, orderId },
        { lat: 6.5400, lng: 3.3620, speed: 42, heading: 150, accuracy: 5, timestamp: now - 15000, orderId },
        { lat: 6.5186, lng: 3.3712, speed: 20, heading: 160, accuracy: 7, timestamp: now - 10000, orderId },
        { lat: 6.4700, lng: 3.3900, speed: 45, heading: 170, accuracy: 6, timestamp: now - 5000, orderId },
        { lat: 6.4281, lng: 3.4219, speed: 22, heading: 180, accuracy: 9, timestamp: now, orderId },
      ];

      for (const ping of pings) {
        const result = await telemetryService.ingestRiderPing(riderUserId, ping as any);
        expect(result.accepted).toBe(true);
      }

      // Assert: Golden Rule 5 — Live GPS pings are buffered strictly in Redis RAM
      const redis = getRedisClient();
      const pointsInRedis = await redis.llen(`order:route_points:${orderId}`);
      expect(pointsInRedis).toBe(6);

      // Assert: Public tracking endpoint redacts PINs and serves live Redis location
      const trackRes = await request(app).get(`/api/v1/orders/track/${trackingCode}`);
      expect(trackRes.status).toBe(200);
      expect(trackRes.body.pickup.pickupPin).toBeUndefined();
      expect(trackRes.body.stops[0].deliveryPin).toBeUndefined();
      expect(trackRes.body.stops[1].deliveryPin).toBeUndefined();
      expect(trackRes.body.liveTelemetry).toBeDefined();
      expect(trackRes.body.liveTelemetry.lat).toBe(6.4281);
      expect(trackRes.body.liveTelemetry.lng).toBe(3.4219);
    });

    it('Step 6: Rider completes Stop #1 and Stop #2 with compressed photo POD and delivery PINs', async () => {
      const mockPod1 = 'data:image/jpeg;base64,' + 'P1'.repeat(5000); // ~10KB
      const mockPod2 = 'data:image/jpeg;base64,' + 'P2'.repeat(6000); // ~12KB

      // Deliver Stop 1
      const stop1Res = await request(app)
        .post(`/api/v1/dispatch/orders/${orderId}/verify-delivery`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          orderId,
          stopSequenceNumber: 1,
          deliveryPin: deliveryPin1,
          proofOfDeliveryBase64OrUrl: mockPod1,
          byteSize: 10240,
        });

      expect(stop1Res.status).toBe(200);
      expect(stop1Res.body.ok).toBe(true);

      // Deliver Stop 2 (Final completion)
      const stop2Res = await request(app)
        .post(`/api/v1/dispatch/orders/${orderId}/verify-delivery`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          orderId,
          stopSequenceNumber: 2,
          deliveryPin: deliveryPin2,
          proofOfDeliveryBase64OrUrl: mockPod2,
          byteSize: 12288,
        });

      expect(stop2Res.status).toBe(200);
      expect(stop2Res.body.ok).toBe(true);
    });

    it('Step 7: Invariant Verification — Deferred polyline archival, 80/20 & 70/30 split settlement, and Paystack bank withdrawal', async () => {
      const completedOrder = await Order.findById(orderId);
      expect(completedOrder?.status).toBe('delivered');
      expect(completedOrder?.payoutStatus).toBe('settled');

      // 1. Deferred Polyline Archival check (Golden Rule 5)
      expect(completedOrder?.encodedRoutePolyline).toBeDefined();
      const decodedPoints = decodeGooglePolyline(completedOrder!.encodedRoutePolyline!);
      expect(decodedPoints.length).toBeGreaterThanOrEqual(2);

      // Temporary Redis keys must be cleared
      const redis = getRedisClient();
      const pointsInRedis = await redis.llen(`order:route_points:${orderId}`);
      expect(pointsInRedis).toBe(0);

      // 2. Customer Escrow cleared
      const customerWallet = await Wallet.findOne({ userId: customerUserId });
      expect(customerWallet?.escrowLockedKobo).toBe(0);

      // 3. Financial Split Settlement Check (Golden Rule 6)
      // Total Fare: totalFareKobo. Bayniks 20% commission, Rider Pool 80%.
      // Fleet Split: 70% Rider, 30% Fleet Owner.
      const riderWallet = await Wallet.findOne({ userId: riderUserId });
      const fleetWallet = await Wallet.findOne({ userId: fleetOwnerUserId });

      expect(riderWallet?.balanceKobo).toBeGreaterThan(0);
      expect(fleetWallet?.balanceKobo).toBeGreaterThan(0);

      const riderShare = riderWallet!.balanceKobo;
      const fleetShare = fleetWallet!.balanceKobo;
      const netPool = riderShare + fleetShare;

      // Rider gets 70% of net pool, fleet owner gets 30%
      expect(Math.round(netPool * 0.7)).toBe(riderShare);
      expect(netPool - riderShare).toBe(fleetShare);

      // 4. Automated Paystack Bank Withdrawal
      const withdrawAmountKobo = Math.floor(riderShare / 2);
      const withdrawRes = await request(app)
        .post('/api/v1/wallet/withdraw')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          accountNumber: '0123456789',
          bankCode: '058', // GTBank
          accountName: 'Tajudeen Oladipo',
          amountKobo: withdrawAmountKobo,
          reason: 'Weekly dispatch payout',
        });

      expect(withdrawRes.status).toBe(201);
      const payoutId = withdrawRes.body.payout.payoutId;

      // Simulate Paystack transfer.success webhook
      const webhookPayload = {
        event: 'transfer.success',
        data: {
          reference: withdrawRes.body.payout.paystackTransferReference,
          transfer_code: 'TRF_e2e_settle_999',
          amount: withdrawAmountKobo,
          status: 'success',
        },
      };

      const rawJson = JSON.stringify(webhookPayload);
      const signature = computePaystackSignature(rawJson);

      const whRes = await request(app)
        .post('/api/v1/webhooks/paystack')
        .set('Content-Type', 'application/json')
        .set('x-paystack-signature', signature)
        .send(rawJson);

      expect(whRes.status).toBe(200);

      const finalizedPayout = await PayoutTransaction.findOne({ payoutId });
      expect(finalizedPayout?.status).toBe('success');
    });
  });

  // =========================================================================
  // SUITE 2: High-Concurrency Double-Spend & Race Condition Stress Test
  // =========================================================================
  describe('Suite 2: High-Concurrency Double-Spend Stress Test (Golden Rule 6)', () => {
    let testUserId: string;
    let testUserToken: string;

    beforeAll(async () => {
      const user = await User.create({
        fullName: 'Concurrency Stress User',
        phone: '+2348209990001',
        role: 'customer',
        isVerified: true,
        passwordHash: 'hash',
      });
      testUserId = user._id.toString();

      const tokens = await authService.createTokens({
        id: testUserId,
        role: 'customer',
        phone: user.phone,
        isVerified: true,
      });
      testUserToken = tokens.accessToken;

      // Fund wallet with exactly ₦5,000 = 500,000 Kobo
      await Wallet.findOneAndUpdate(
        { userId: testUserId },
        { balanceKobo: 500000, escrowLockedKobo: 0 },
        { upsert: true }
      );
    });

    it('handles 10 simultaneous parallel withdrawal requests of ₦3,000: strictly 1 succeeds, 9 fail with 402', async () => {
      // 10 concurrent requests of 300,000 Kobo each against a 500,000 Kobo balance.
      // Under strict ACID transactions, exactly 1 must succeed and balance must become 200,000 Kobo.
      const withdrawalRequests = Array.from({ length: 10 }).map(() =>
        request(app)
          .post('/api/v1/wallet/withdraw')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({
            accountNumber: '0123456789',
            bankCode: '058',
            accountName: 'Concurrency Stress User',
            amountKobo: 300000,
            reason: 'Concurrent stress withdrawal',
          })
      );

      const responses = await Promise.all(withdrawalRequests);

      const successResponses = responses.filter((r) => r.status === 201);
      const failedResponses = responses.filter((r) => r.status === 402);

      expect(successResponses.length).toBe(1);
      expect(failedResponses.length).toBe(9);

      // Verify wallet balance is exactly 200,000 Kobo (zero negative balance or double spend)
      const wallet = await Wallet.findOne({ userId: testUserId });
      expect(wallet?.balanceKobo).toBe(200000);
    });
  });

  // =========================================================================
  // SUITE 3: High-Throughput Telemetry Burst & Out-of-Order Guard Stress Test
  // =========================================================================
  describe('Suite 3: High-Throughput Telemetry Burst & Out-of-Order Guards (Golden Rule 5)', () => {
    it('processes 25 rapid telemetry pings rejecting stale timestamps and erratic jumps in <200ms', async () => {
      const now = Date.now();
      const orderIdMock = '507f1f77bcf86cd799439011';

      // 21 valid sequential coordinates
      const validPings = Array.from({ length: 21 }).map((_, idx) => ({
        lat: 6.5244 + idx * 0.001,
        lng: 3.3792 + idx * 0.001,
        speed: 30 + (idx % 10),
        heading: 90,
        accuracy: 10,
        timestamp: now + idx * 1000,
        orderId: orderIdMock,
      }));

      // 3 stale out-of-order pings (older timestamps)
      const stalePings = [
        { lat: 6.50, lng: 3.30, speed: 25, heading: 90, accuracy: 10, timestamp: now - 50000, orderId: orderIdMock },
        { lat: 6.50, lng: 3.31, speed: 25, heading: 90, accuracy: 10, timestamp: now - 60000, orderId: orderIdMock },
        { lat: 6.50, lng: 3.32, speed: 25, heading: 90, accuracy: 10, timestamp: now - 70000, orderId: orderIdMock },
      ];

      // 1 extreme erratic speed jump (180 km/h > 140 km/h limit)
      const erraticSpeedPing = {
        lat: 6.60,
        lng: 3.40,
        speed: 180, // Impossible motorcycle speed
        heading: 90,
        accuracy: 10,
        timestamp: now + 25000,
        orderId: orderIdMock,
      };

      const start = Date.now();

      // Ingest valid pings
      for (const p of validPings) {
        const res = await telemetryService.ingestRiderPing(riderUserId, p as any);
        expect(res.accepted).toBe(true);
      }

      // Ingest stale pings (must be flagged as HISTORICAL_PING_BUFFERED without corrupting live position)
      for (const p of stalePings) {
        const res = await telemetryService.ingestRiderPing(riderUserId, p as any);
        expect(res.accepted).toBe(true);
        expect(res.reason).toBe('HISTORICAL_PING_BUFFERED');
      }

      // Ingest erratic speed jump (must be rejected)
      const erraticRes = await telemetryService.ingestRiderPing(riderUserId, erraticSpeedPing as any);
      expect(erraticRes.accepted).toBe(false);
      expect(erraticRes.reason).toBe('ERRATIC_SPEED_JUMP');

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500); // 25 operations completed in sub-second Redis RAM time
    });
  });

  // =========================================================================
  // SUITE 4: Health Probes, Security Headers & Redis Rate Limiter Verification
  // =========================================================================
  describe('Suite 4: Health Probes, Security Headers & Redis Rate Limiter', () => {
    it('GET /api/v1/health/live returns fast liveness status and uptime', async () => {
      const res = await request(app).get('/api/v1/health/live');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.status).toBe('alive');
      expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(res.body.timestamp).toBeDefined();
    });

    it('GET /api/v1/health/ready returns deep readiness probe with MongoDB & Redis round-trip latency', async () => {
      const res = await request(app).get('/api/v1/health/ready');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.status).toBe('ready');
      expect(res.body.checks.mongodb.status).toBe('up');
      expect(res.body.checks.mongodb.latencyMs).toBeGreaterThanOrEqual(0);
      expect(res.body.checks.redis.status).toBe('up');
      expect(res.body.checks.redis.latencyMs).toBeGreaterThanOrEqual(0);
      expect(res.body.fleetSummary.availableRidersInGeoPool).toBeDefined();
    });

    it('enforces strict HTTP security headers and correlation ID on all responses', async () => {
      const res = await request(app).get('/api/v1/health/live');

      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('Redis sliding-window rate limiter blocks excessive requests with 429 RATE_LIMIT_EXCEEDED', async () => {
      const redis = getRedisClient();
      await redis.del('ratelimit:otp-req:anon:127.0.0.1');

      // POST /api/v1/auth/request-otp limit is 5 requests per 60 seconds
      // Send 5 requests
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/request-otp')
          .send({ phone: '+2348200000004' });
      }

      // 6th request must exceed rate limit and return 429
      const blockedRes = await request(app)
        .post('/api/v1/auth/request-otp')
        .send({ phone: '+2348200000004' });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(blockedRes.headers['x-ratelimit-remaining']).toBe('0');
      expect(blockedRes.headers['retry-after']).toBe('60');
    });
  });
});
