import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectMongo, disconnectMongo } from '../config/db';
import { getRedisClient, closeRedis } from '../config/redis';
import { User, Order, RiderProfile } from '../models';
import { authService } from '../services/auth.service';
import { toGeoJsonPoint } from '@logistics/shared-types';

const app = createApp();

describe('Stage 18: Super-Admin & Fleet Command Center ("God\'s Eye" Radar & Reassignment)', () => {
  let adminToken: string;
  let adminUserId: string;
  let fleetOwnerToken: string;
  let fleetOwnerUserId: string;

  let riderAId: string;
  let riderBId: string;
  let riderIndependentId: string;

  let riderAProfileId: string;
  let riderBProfileId: string;
  let pendingRiderProfileId: string;
  let pendingRiderUserId: string;

  beforeAll(async () => {
    await connectMongo();
    await User.deleteMany({ phone: { $regex: /^\+234812/ } });
    await Order.deleteMany({ trackingCode: { $regex: /^LGS-ADM/ } });

    // 1. Create Super-Admin
    const adminUser = await User.create({
      fullName: 'Super Admin Officer',
      phone: '+2348120000001',
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

    // 2. Create Fleet Owner
    const fleetOwnerUser = await User.create({
      fullName: 'Alhaji Danladi Fleet Logistics',
      phone: '+2348120000002',
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

    // 3. Create Rider A (Assigned to Fleet Owner)
    const riderAUser = await User.create({
      fullName: 'Rider A Danladi',
      phone: '+2348120000003',
      role: 'rider',
      isVerified: true,
      passwordHash: 'hashedpassword',
    });
    riderAId = riderAUser._id.toString();

    const riderAProfile = await RiderProfile.create({
      userId: riderAUser._id,
      fleetOwnerId: fleetOwnerUser._id,
      vehicleType: 'bike',
      plateNumber: 'KJA-101-AD',
      ridersCardNumber: 'CARD-101',
      ridersCardDocumentUrl: 'https://cdn.bayniks.com/docs/card101.pdf',
      kycStatus: 'approved',
      status: 'busy',
      lastLocation: toGeoJsonPoint({ lat: 6.5933, lng: 3.3421 }), // Ikeja
      lastSeenAt: new Date(),
    });
    riderAProfileId = riderAProfile._id.toString();

    // 4. Create Rider B (Assigned to Fleet Owner, Available for Reassignment)
    const riderBUser = await User.create({
      fullName: 'Rider B Fast',
      phone: '+2348120000004',
      role: 'rider',
      isVerified: true,
      passwordHash: 'hashedpassword',
    });
    riderBId = riderBUser._id.toString();

    const riderBProfile = await RiderProfile.create({
      userId: riderBUser._id,
      fleetOwnerId: fleetOwnerUser._id,
      vehicleType: 'bike',
      plateNumber: 'KJA-102-BF',
      ridersCardNumber: 'CARD-102',
      ridersCardDocumentUrl: 'https://cdn.bayniks.com/docs/card102.pdf',
      kycStatus: 'approved',
      status: 'available',
      lastLocation: toGeoJsonPoint({ lat: 6.6000, lng: 3.3500 }), // Ikeja
      lastSeenAt: new Date(),
    });
    riderBProfileId = riderBProfile._id.toString();

    // 5. Create Independent Rider (NOT in Fleet Owner's fleet, Flagged with Mock Location)
    const indUser = await User.create({
      fullName: 'Independent Rider Spoof',
      phone: '+2348120000005',
      role: 'rider',
      isVerified: true,
      passwordHash: 'hashedpassword',
    });
    riderIndependentId = indUser._id.toString();

    await RiderProfile.create({
      userId: indUser._id,
      fleetOwnerId: null,
      vehicleType: 'bike',
      plateNumber: 'IKJ-999-SP',
      ridersCardNumber: 'CARD-999',
      ridersCardDocumentUrl: 'https://cdn.bayniks.com/docs/card999.pdf',
      kycStatus: 'approved',
      status: 'busy',
      lastLocation: toGeoJsonPoint({ lat: 6.5186, lng: 3.3712 }), // Yaba
      lastSeenAt: new Date(),
    });

    // 6. Create Pending KYC Applicant Rider
    const pendingUser = await User.create({
      fullName: 'Applicant Rider Ibrahim',
      phone: '+2348120000006',
      role: 'rider',
      isVerified: false,
      passwordHash: 'hashedpassword',
    });

    const pendingProfile = await RiderProfile.create({
      userId: pendingUser._id,
      fleetOwnerId: null,
      vehicleType: 'bike',
      plateNumber: 'APP-777-YY',
      ridersCardNumber: 'CARD-777',
      ridersCardDocumentUrl: 'https://cdn.bayniks.com/docs/card777.pdf',
      kycStatus: 'pending',
      status: 'offline',
      lastLocation: toGeoJsonPoint({ lat: 6.5244, lng: 3.3792 }),
      lastSeenAt: new Date(),
    });
    pendingRiderProfileId = pendingProfile._id.toString();
    pendingRiderUserId = pendingUser._id.toString();

    // Set Redis Telemetry states:
    const redis = getRedisClient();
    // Rider B in available locations pool
    await redis.geoadd('riders:available:locations', 3.3500, 6.6000, riderBId);

    // Rider A telemetry
    await redis.hset(`rider:telemetry:${riderAId}`, {
      lat: '6.5933',
      lng: '3.3421',
      bearing: '45',
      speed: '38',
      isMockLocation: 'false',
      updatedAt: String(Date.now()),
    });

    // Independent Rider telemetry (FLAGGED WITH FAKE GPS / MOCK LOCATION)
    await redis.hset(`rider:telemetry:${riderIndependentId}`, {
      lat: '6.5186',
      lng: '3.3712',
      bearing: '180',
      speed: '22',
      isMockLocation: 'true',
      updatedAt: String(Date.now()),
    });
  });

  afterAll(async () => {
    await User.deleteMany({ phone: { $regex: /^\+234812/ } });
    await RiderProfile.deleteMany({ plateNumber: { $in: ['KJA-101-AD', 'KJA-102-BF', 'IKJ-999-SP', 'APP-777-YY'] } });
    await Order.deleteMany({ trackingCode: { $regex: /^LGS-ADM/ } });

    const redis = getRedisClient();
    await redis.del(`rider:telemetry:${riderAId}`);
    await redis.del(`rider:telemetry:${riderBId}`);
    await redis.del(`rider:telemetry:${riderIndependentId}`);
    await redis.zrem('riders:available:locations', riderAId, riderBId, riderIndependentId);

    await closeRedis();
    await disconnectMongo();
  });

  describe('Suite 1: "God\'s Eye" Fleet Snapshot & Mock GPS Flag Detection', () => {
    it('returns the entire Lagos fleet for Super-Admin and flags mock location spoofers', async () => {
      const res = await request(app)
        .get('/api/v1/admin/fleet/live')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.onlineCount).toBeGreaterThanOrEqual(3);
      expect(res.body.busyCount).toBeGreaterThanOrEqual(2);
      expect(res.body.mockLocationFlaggedCount).toBeGreaterThanOrEqual(1);
      expect(res.body.pendingKycCount).toBeGreaterThanOrEqual(1);

      // Verify bikes array
      const bikes = res.body.bikes;
      expect(Array.isArray(bikes)).toBe(true);

      const indBike = bikes.find((b: any) => b.riderUserId === riderIndependentId);
      expect(indBike).toBeDefined();
      expect(indBike.isMockLocation).toBe(true);
      expect(indBike.lat).toBeCloseTo(6.5186, 2);
      expect(indBike.lng).toBeCloseTo(3.3712, 2);

      const riderABike = bikes.find((b: any) => b.riderUserId === riderAId);
      expect(riderABike).toBeDefined();
      expect(riderABike.isMockLocation).toBe(false);
      expect(riderABike.plateNumber).toBe('KJA-101-AD');
    });
  });

  describe('Suite 2: Fleet Owner Role Scoping Isolation', () => {
    it('scopes God\'s Eye snapshot strictly to the Fleet Owner\'s own motorcycles', async () => {
      const res = await request(app)
        .get('/api/v1/admin/fleet/live')
        .set('Authorization', `Bearer ${fleetOwnerToken}`);

      expect(res.status).toBe(200);
      const bikes = res.body.bikes;

      // Fleet Owner owns Rider A and Rider B
      const riderAFound = bikes.some((b: any) => b.riderUserId === riderAId);
      const riderBFound = bikes.some((b: any) => b.riderUserId === riderBId);
      expect(riderAFound).toBe(true);
      expect(riderBFound).toBe(true);

      // Independent rider MUST NOT be visible to this Fleet Owner
      const indFound = bikes.some((b: any) => b.riderUserId === riderIndependentId);
      expect(indFound).toBe(false);
    });
  });

  describe('Suite 3: Atomic Mid-Trip Emergency Order Reassignment', () => {
    let orderToReassignId: string;

    beforeAll(async () => {
      // Create a 2-stop active order assigned to Rider A
      const order = await Order.create({
        trackingCode: 'LGS-ADM001',
        senderId: adminUserId,
        riderId: riderAId,
        vehicleType: 'bike',
        paymentMethod: 'wallet',
        paymentStatus: 'paid',
        status: 'in_transit',
        estimatedDistanceKm: 12.5,
        totalFareKobo: 350000,
        platformCommissionKobo: 70000,
        riderEarningKobo: 280000,
        pickup: {
          address: 'Ikeja Plaza',
          landmark: 'Opposite Slot',
          location: { type: 'Point', coordinates: [3.3421, 6.5933] },
          contactName: 'Manager Tunde',
          contactPhone: '+2348120000001',
          pickupPin: '4455',
        },
        stops: [
          {
            sequenceNumber: 1,
            recipientName: 'Delivered Customer',
            recipientPhone: '+2348011112222',
            dropoffAddress: 'Maryland Mall',
            dropoffLandmark: 'Inside Mall',
            dropoffLocation: { type: 'Point', coordinates: [3.3678, 6.5722] },
            packageDescription: 'Shirt',
            deliveryPin: '1122',
            status: 'delivered', // Stop 1 already completed!
          },
          {
            sequenceNumber: 2,
            recipientName: 'Pending Customer',
            recipientPhone: '+2348033334444',
            dropoffAddress: 'Admiralty Way, Lekki',
            dropoffLandmark: 'Near Ebeano',
            dropoffLocation: { type: 'Point', coordinates: [3.4723, 6.4474] },
            packageDescription: 'Jeans',
            deliveryPin: '3344',
            status: 'pending', // Stop 2 awaiting delivery
          },
        ],
      });
      orderToReassignId = order._id.toString();
    });

    it('rejects reassignment if replacement rider is not approved or not available', async () => {
      // Trying to assign to pending unverified applicant rider
      const res = await request(app)
        .post(`/api/v1/admin/orders/${orderToReassignId}/reassign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          newRiderUserId: pendingRiderUserId, // profile exists, but not approved
          reason: 'Emergency breakdown',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('RIDER_NOT_APPROVED');
    });

    it('atomically reassigns order from Rider A to Rider B, preserving delivered stops and PINs', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/orders/${orderToReassignId}/reassign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          newRiderUserId: riderBId,
          reason: 'Rider A flat tire on Mobolaji Bank Anthony Way',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('successfully reassigned');
      expect(res.body.previousRiderId).toBe(riderAId);
      expect(res.body.newRiderId).toBe(riderBId);

      // Verify Order document in MongoDB
      const updatedOrder = await Order.findById(orderToReassignId);
      expect(updatedOrder).not.toBeNull();
      expect(updatedOrder?.riderId?.toString()).toBe(riderBId);

      // CRITICAL PRESERVATION: Stop #1 remains delivered, Stop #2 remains pending with intact PINs
      expect(updatedOrder?.stops[0]?.status).toBe('delivered');
      expect(updatedOrder?.stops[0]?.deliveryPin).toBe('1122');
      expect(updatedOrder?.stops[1]?.status).toBe('pending');
      expect(updatedOrder?.stops[1]?.deliveryPin).toBe('3344');
      expect(updatedOrder?.pickup.pickupPin).toBe('4455');

      // Verify Rider Profiles updated
      const profileA = await RiderProfile.findOne({ userId: riderAId });
      expect(profileA?.status).toBe('available'); // Freed from busy

      const profileB = await RiderProfile.findOne({ userId: riderBId });
      expect(profileB?.status).toBe('busy'); // Locked to busy

      // Verify Redis: Rider B removed from available pool
      const redis = getRedisClient();
      const inPool = await redis.zscore('riders:available:locations', riderBId);
      expect(inPool).toBeNull();

      // Verify Redis telemetry activeOrderId set for Rider B
      const bTelemetry = await redis.hgetall(`rider:telemetry:${riderBId}`);
      expect(bTelemetry.activeOrderId).toBe(orderToReassignId);
      expect(bTelemetry.trackingCode).toBe('LGS-ADM001');
    });
  });

  describe('Suite 4: Admin KYC Approval & Rejection Queue', () => {
    it('GET /api/v1/admin/kyc/pending lists applicants in the verification queue', async () => {
      const res = await request(app)
        .get('/api/v1/admin/kyc/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pendingCount).toBeGreaterThanOrEqual(1);
      const found = res.body.riders.find((r: any) => r.id === pendingRiderProfileId);
      expect(found).toBeDefined();
      expect(found.plateNumber).toBe('APP-777-YY');
    });

    it('PATCH /api/v1/admin/kyc/:riderProfileId approves applicant rider KYC', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/kyc/${pendingRiderProfileId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          decision: 'approved',
        });

      expect(res.status).toBe(200);
      expect(res.body.profile.kycStatus).toBe('approved');

      const profile = await RiderProfile.findById(pendingRiderProfileId);
      expect(profile?.kycStatus).toBe('approved');
    });
  });
});
