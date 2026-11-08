import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectMongo, disconnectMongo } from '../config/db';
import { getRedisClient, closeRedis } from '../config/redis';
import { User, Order, RiderProfile, Wallet, WalletTransaction } from '../models';
import { authService } from '../services/auth.service';
import { walletService } from '../services/wallet.service';
import { decodeGooglePolyline } from '@logistics/shared-types';

const app = createApp();

describe('Stage 15: Anti-Fraud 4-Digit PIN Verification, Photo POD (<300KB), Escrow Release & Deferred Polyline Archival', () => {
  let customerUser: any;
  let customerUserId: string;
  let customerToken: string;

  let riderUser: any;
  let riderUserId: string;
  let riderToken: string;

  beforeAll(async () => {
    await connectMongo();
    await User.deleteMany({ phone: { $regex: /^\+234811/ } });
    await RiderProfile.deleteMany({ plateNumber: { $regex: /PIN-15/ } });
    await Order.deleteMany({ trackingCode: { $regex: /LGS-PIN/ } });

    // 1. Create Verified Customer with funded Wallet
    customerUser = await User.create({
      fullName: 'Bolanle Alabi (Sender)',
      phone: '+2348110001001',
      role: 'customer',
      isVerified: true,
      passwordHash: 'hashedpass',
    });
    customerUserId = customerUser._id.toString();
    const cTokens = await authService.createTokens({
      id: customerUserId,
      role: 'customer',
      phone: customerUser.phone,
      isVerified: true,
    });
    customerToken = cTokens.accessToken;

    // 2. Create Verified Rider & RiderProfile
    riderUser = await User.create({
      fullName: 'Kabiru Sanusi (Rider)',
      phone: '+2348110001002',
      role: 'rider',
      isVerified: true,
      passwordHash: 'hashedpass',
    });
    riderUserId = riderUser._id.toString();
    const rTokens = await authService.createTokens({
      id: riderUserId,
      role: 'rider',
      phone: riderUser.phone,
      isVerified: true,
    });
    riderToken = rTokens.accessToken;

    await RiderProfile.create({
      userId: riderUser._id,
      vehicleType: 'bike',
      plateNumber: 'PIN-15-AAA',
      ridersCardNumber: 'RC-PIN-15',
      ridersCardDocumentUrl: 'https://docs.test/rc-pin15.jpg',
      status: 'busy',
      rating: 4.95,
      lastLocation: {
        type: 'Point',
        coordinates: [3.35, 6.6], // [lng, lat]
      },
    });
  });

  afterAll(async () => {
    const redis = getRedisClient();
    await redis.zrem('riders:available:locations', riderUserId);
    await User.deleteMany({ phone: { $regex: /^\+234811/ } });
    await RiderProfile.deleteMany({ plateNumber: { $regex: /PIN-15/ } });
    await Order.deleteMany({ trackingCode: { $regex: /LGS-PIN/ } });
    await Wallet.deleteMany({ userId: { $in: [customerUserId, riderUserId] } });
    await WalletTransaction.deleteMany({ walletUserId: { $in: [customerUserId, riderUserId] } });
    await disconnectMongo();
    await closeRedis();
  });

  describe('Suite 1: Anti-Fraud Pickup PIN Verification & 5-Attempt Lockout', () => {
    let order: any;

    beforeAll(async () => {
      // Create Order at arrived_pickup
      order = await Order.create({
        trackingCode: 'LGS-PIN-001',
        senderId: customerUser._id,
        riderId: riderUser._id,
        status: 'arrived_pickup',
        vehicleType: 'bike',
        paymentMethod: 'wallet',
        paymentStatus: 'paid',
        estimatedDistanceKm: 5.2,
        totalFareKobo: 250000,
        platformCommissionKobo: 50000,
        riderEarningKobo: 200000,
        pickup: {
          address: 'Opebi Road, Ikeja',
          landmark: 'Opposite Salvation Bus Stop',
          location: { type: 'Point', coordinates: [3.356, 6.598] },
          contactName: 'Bolanle Alabi',
          contactPhone: '+2348110001001',
          pickupPin: '4821', // Actual true pickup PIN
        },
        stops: [
          {
            sequenceNumber: 1,
            recipientName: 'Demola',
            recipientPhone: '+2348030001122',
            dropoffAddress: 'Adeniyi Jones, Ikeja',
            dropoffLandmark: 'Beside Vulcanizer',
            dropoffLocation: { type: 'Point', coordinates: [3.345, 6.602] },
            packageDescription: 'Electronics parcel',
            deliveryPin: '9152',
            status: 'pending',
          },
        ],
      });

      // Clear any leftover redis lockout keys
      const redis = getRedisClient();
      await redis.del(`pin:attempts:${order._id}:pickup`);
    });

    it('rejects wrong pickup PIN with 400 INVALID_PICKUP_PIN and preserves arrived_pickup state', async () => {
      const res = await request(app)
        .post(`/api/v1/dispatch/orders/${order._id}/verify-pickup`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          orderId: order._id.toString(),
          pickupPin: '0000', // WRONG PIN
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_PICKUP_PIN');

      const reloaded = await Order.findById(order._id);
      expect(reloaded!.status).toBe('arrived_pickup');
    });

    it('enforces brute-force defense: locks out after 5 consecutive failed attempts with 429 PIN_ATTEMPTS_EXCEEDED', async () => {
      // Send 4 more wrong attempts (making it 5 total failed attempts)
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post(`/api/v1/dispatch/orders/${order._id}/verify-pickup`)
          .set('Authorization', `Bearer ${riderToken}`)
          .send({
            orderId: order._id.toString(),
            pickupPin: '9999',
          });
      }

      // 6th attempt must be blocked by rate limit / lockout with 429
      const lockedRes = await request(app)
        .post(`/api/v1/dispatch/orders/${order._id}/verify-pickup`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          orderId: order._id.toString(),
          pickupPin: '4821', // Even correct PIN is blocked once locked out
        });

      expect(lockedRes.status).toBe(429);
      expect(lockedRes.body.code).toBe('PIN_ATTEMPTS_EXCEEDED');
    });

    it('successfully verifies true pickup PIN and advances order to in_transit', async () => {
      // Clear Redis attempt counter for testing successful verification
      const redis = getRedisClient();
      await redis.del(`pin:attempts:${order._id}:pickup`);

      const res = await request(app)
        .post(`/api/v1/dispatch/orders/${order._id}/verify-pickup`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          orderId: order._id.toString(),
          pickupPin: '4821', // TRUE PIN
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.order.status).toBe('in_transit');

      const reloaded = await Order.findById(order._id);
      expect(reloaded!.status).toBe('in_transit');
      expect(reloaded!.stops[0]!.status).toBe('en_route');
    });
  });

  describe('Suite 2: Oversized POD Image Size Guard (>300KB)', () => {
    let order: any;

    beforeAll(async () => {
      order = await Order.create({
        trackingCode: 'LGS-PIN-002',
        senderId: customerUser._id,
        riderId: riderUser._id,
        status: 'in_transit',
        vehicleType: 'bike',
        paymentMethod: 'wallet',
        paymentStatus: 'paid',
        estimatedDistanceKm: 3.5,
        totalFareKobo: 200000,
        platformCommissionKobo: 40000,
        riderEarningKobo: 160000,
        pickup: {
          address: 'Opebi Road, Ikeja',
          landmark: 'Opposite Salvation Bus Stop',
          location: { type: 'Point', coordinates: [3.356, 6.598] },
          contactName: 'Bolanle Alabi',
          contactPhone: '+2348110001001',
          pickupPin: '1111',
        },
        stops: [
          {
            sequenceNumber: 1,
            recipientName: 'Kemi',
            recipientPhone: '+2348030001122',
            dropoffAddress: 'Adeniyi Jones, Ikeja',
            dropoffLandmark: 'Beside Vulcanizer',
            dropoffLocation: { type: 'Point', coordinates: [3.345, 6.602] },
            packageDescription: 'Electronics parcel',
            deliveryPin: '3333',
            status: 'en_route',
          },
        ],
      });
    });

    it('rejects delivery verification when byteSize exceeds 307,200 bytes with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/v1/dispatch/orders/${order._id}/verify-delivery`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          orderId: order._id.toString(),
          stopSequenceNumber: 1,
          deliveryPin: '3333',
          proofOfDeliveryBase64OrUrl: 'https://storage.test/huge-photo.jpg',
          byteSize: 650000, // 650KB > 300KB limit
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('rejects delivery verification when base64 payload length exceeds 300KB with 400 Bad Request', async () => {
      // 500,000 chars base64 ≈ 375KB
      const hugeBase64 = 'data:image/jpeg;base64,' + 'X'.repeat(500000);

      const res = await request(app)
        .post(`/api/v1/dispatch/orders/${order._id}/verify-delivery`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          orderId: order._id.toString(),
          stopSequenceNumber: 1,
          deliveryPin: '3333',
          proofOfDeliveryBase64OrUrl: hugeBase64,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('POD_IMAGE_TOO_LARGE');
    });
  });

  describe('Suite 3: Multi-Stop Sequential Delivery, Deferred Polyline Archival & Escrow Payout', () => {
    let order: any;
    const redis = getRedisClient();

    beforeAll(async () => {
      // Fund sender wallet with 5,000 Naira (500,000 kobo)
      await Wallet.findOneAndUpdate(
        { userId: customerUser._id },
        { balanceKobo: 500000, escrowLockedKobo: 0 },
        { upsert: true }
      );

      // Create a 2-Stop Order
      order = await Order.create({
        trackingCode: 'LGS-PIN-003',
        senderId: customerUser._id,
        riderId: riderUser._id,
        status: 'pending',
        vehicleType: 'bike',
        paymentMethod: 'wallet',
        paymentStatus: 'unpaid',
        estimatedDistanceKm: 12.0,
        totalFareKobo: 300000, // ₦3,000.00
        platformCommissionKobo: 60000, // ₦600.00 (20%)
        riderEarningKobo: 240000, // ₦2,400.00 (80%)
        pickup: {
          address: 'Ikeja City Mall',
          landmark: 'Near Cinema',
          location: { type: 'Point', coordinates: [3.358, 6.619] },
          contactName: 'Bolanle',
          contactPhone: '+2348110001001',
          pickupPin: '5555',
        },
        stops: [
          {
            sequenceNumber: 1,
            recipientName: 'Stop 1 Recipient',
            recipientPhone: '+2348011111111',
            dropoffAddress: 'Maryland Mall',
            dropoffLandmark: 'Food court',
            dropoffLocation: { type: 'Point', coordinates: [3.368, 6.572] },
            packageDescription: 'Part 1 package',
            deliveryPin: '1234',
            status: 'pending',
          },
          {
            sequenceNumber: 2,
            recipientName: 'Stop 2 Recipient (Final)',
            recipientPhone: '+2348022222222',
            dropoffAddress: 'Victoria Island',
            dropoffLandmark: 'Near Eko Hotel',
            dropoffLocation: { type: 'Point', coordinates: [3.425, 6.428] },
            packageDescription: 'Part 2 package',
            deliveryPin: '5678',
            status: 'pending',
          },
        ],
      });

      // Lock escrow via walletService
      await walletService.lockOrderEscrowFromWallet({
        userId: customerUserId,
        orderId: order._id.toString(),
      });

      // Advance order to in_transit
      await Order.findByIdAndUpdate(order._id, { status: 'in_transit' });

      // Ingest 5 GPS breadcrumb points into Redis RAM (Golden Rule 5)
      const routePointsKey = `order:route_points:${order._id}`;
      await redis.del(routePointsKey);

      const breadcrumbCoordinates = [
        { lat: 6.6198, lng: 3.3587, ts: Date.now() - 20000 },
        { lat: 6.5950, lng: 3.3610, ts: Date.now() - 15000 },
        { lat: 6.5721, lng: 3.3683, ts: Date.now() - 10000 },
        { lat: 6.5000, lng: 3.3800, ts: Date.now() - 5000 },
        { lat: 6.4281, lng: 3.4250, ts: Date.now() },
      ];

      for (const pt of breadcrumbCoordinates) {
        await redis.rpush(routePointsKey, JSON.stringify(pt));
      }
    });

    it('verifies Stop #1: updates Stop #1 to delivered while overall order stays in_transit and escrow is held', async () => {
      const mockPodPhoto = 'data:image/jpeg;base64,' + 'M'.repeat(20000); // ~15KB photo

      const res = await request(app)
        .post(`/api/v1/dispatch/orders/${order._id}/verify-delivery`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          orderId: order._id.toString(),
          stopSequenceNumber: 1,
          deliveryPin: '1234', // Valid Stop 1 PIN
          proofOfDeliveryBase64OrUrl: mockPodPhoto,
          byteSize: 15360,
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const reloadedOrder = await Order.findById(order._id);
      expect(reloadedOrder!.status).toBe('in_transit');
      expect(reloadedOrder!.stops[0]!.status).toBe('delivered');
      expect(reloadedOrder!.stops[0]!.proofOfDeliveryPhotoUrl).toBe(mockPodPhoto);
      expect(reloadedOrder!.stops[0]!.deliveredAt).toBeDefined();

      // Stop #2 should be en_route
      expect(reloadedOrder!.stops[1]!.status).toBe('en_route');

      // ESCROW GUARD: Escrow must NOT be released before all stops are complete!
      const senderWallet = await Wallet.findOne({ userId: customerUserId });
      expect(senderWallet!.escrowLockedKobo).toBe(300000); // ₦3,000 held

      const riderWallet = await Wallet.findOne({ userId: riderUserId });
      expect(riderWallet?.balanceKobo || 0).toBe(0); // Rider not paid yet
    });

    it('verifies Stop #2 (Final Stop): triggers deferred polyline archival, releases escrow to rider, and returns rider to available pool', async () => {
      const mockFinalPodPhoto = 'data:image/jpeg;base64,' + 'F'.repeat(25000); // ~18KB photo

      const res = await request(app)
        .post(`/api/v1/dispatch/orders/${order._id}/verify-delivery`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          orderId: order._id.toString(),
          stopSequenceNumber: 2,
          deliveryPin: '5678', // Valid Stop 2 PIN
          proofOfDeliveryBase64OrUrl: mockFinalPodPhoto,
          byteSize: 19200,
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const completedOrder = await Order.findById(order._id);
      // 1. Order Status is DELIVERED
      expect(completedOrder!.status).toBe('delivered');
      expect(completedOrder!.stops[1]!.status).toBe('delivered');

      // 2. Deferred Route Polyline Archival (Golden Rule 5)
      expect(completedOrder!.encodedRoutePolyline).toBeDefined();
      expect(typeof completedOrder!.encodedRoutePolyline).toBe('string');
      const decodedBreadcrumbs = decodeGooglePolyline(completedOrder!.encodedRoutePolyline!);
      expect(decodedBreadcrumbs.length).toBe(5);

      // Redis breadcrumb key cleaned up
      const remainingRedisPoints = await redis.lrange(`order:route_points:${order._id}`, 0, -1);
      expect(remainingRedisPoints.length).toBe(0);

      // 3. Atomic Escrow Release to Rider (Golden Rule 6)
      const senderWallet = await Wallet.findOne({ userId: customerUserId });
      expect(senderWallet!.escrowLockedKobo).toBe(0); // Escrow hold released!

      const riderWallet = await Wallet.findOne({ userId: riderUserId });
      expect(riderWallet!.balanceKobo).toBe(240000); // Exact ₦2,400 (80%) credited!

      // Escrow release transaction record exists
      const releaseTx = await WalletTransaction.findOne({
        orderId: order._id,
        type: 'escrow_release',
      });
      expect(releaseTx).toBeDefined();
      expect(releaseTx!.amountKobo).toBe(240000);

      // 4. Rider Returned to Available Pool
      const riderProfile = await RiderProfile.findOne({ userId: riderUserId });
      expect(riderProfile!.status).toBe('available');
      // Last location updated to final dropoff coordinate: [3.425, 6.428]
      expect(riderProfile!.lastLocation.coordinates[0]).toBe(3.425);
      expect(riderProfile!.lastLocation.coordinates[1]).toBe(6.428);

      // Rider re-indexed in Redis GEO set
      const geoPos = await redis.geopos('riders:available:locations', riderUserId);
      expect(geoPos).toBeDefined();
      expect(geoPos[0]).toBeDefined();
    });
  });
});
