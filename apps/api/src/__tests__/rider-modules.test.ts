import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

// Mock Redis client for standalone execution
const redisMemory = new Map<string, string>();
const mockRedisClient = {
  set: vi.fn(async (key: string, val: string) => {
    redisMemory.set(key, val);
    return 'OK';
  }),
  get: vi.fn(async (key: string) => redisMemory.get(key) || null),
  quit: vi.fn(async () => 'OK'),
  disconnect: vi.fn(),
  status: 'ready',
};

vi.mock('../config/redis', () => ({
  getRedisClient: () => mockRedisClient,
  closeRedis: vi.fn().mockResolvedValue(undefined),
  checkRedisHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
  DEFAULT_REDIS_URL: 'redis://127.0.0.1:6379',
}));

import { createApp } from '../app';
import { connectMongo, disconnectMongo } from '../config/db';
import { User, Order, RiderProfile, Wallet, WalletTransaction } from '../models';
import { authService } from '../services/auth.service';
import { toGeoJsonPoint } from '@logistics/shared-types';

const app = createApp();

describe('Rider Functional Modules: Shift Payouts, Customer Chat & Emergency SOS Suite', () => {
  let replSet: MongoMemoryReplSet;
  let riderToken: string;
  let riderUserId: string;

  let customerToken: string;
  let customerUserId: string;

  let testOrderId: string;
  let testTrackingCode: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const mongoUri = replSet.getUri();
    await connectMongo(mongoUri);

    await User.deleteMany({ phone: { $regex: /^\+234818/ } });
    await Order.deleteMany({ trackingCode: { $regex: /^LGS-MOD/ } });
    await RiderProfile.deleteMany({ plateNumber: 'MOD-999-LG' });

    // 1. Create Verified Rider
    const riderUser = await User.create({
      fullName: 'Tariq Danladi',
      phone: '+2348180000001',
      role: 'rider',
      isVerified: true,
      passwordHash: 'hashedpassword',
    });
    riderUserId = riderUser._id.toString();

    const riderTokens = await authService.createTokens({
      id: riderUserId,
      role: 'rider',
      phone: riderUser.phone,
      isVerified: true,
    });
    riderToken = riderTokens.accessToken;

    // Create Rider Profile
    await RiderProfile.create({
      userId: riderUserId,
      vehicleType: 'bike',
      plateNumber: 'MOD-999-LG',
      ridersCardNumber: 'LASRERA-MOD-001',
      ridersCardDocumentUrl: 'https://cdn.bayniks.com/docs/card.jpg',
      vehiclePhotoUrl: 'https://cdn.bayniks.com/photos/bike.jpg',
      status: 'available',
      kycStatus: 'approved',
      lastLocation: toGeoJsonPoint({ lat: 6.5933, lng: 3.3421 }),
    });

    // Seed Rider Wallet with balance (50,000 kobo = ₦500.00)
    await Wallet.create({
      userId: riderUserId,
      balanceKobo: 50000,
      escrowKobo: 0,
    });

    // 2. Create Customer
    const customerUser = await User.create({
      fullName: 'Kainul Stevano',
      phone: '+2348180000002',
      role: 'customer',
      isVerified: true,
      passwordHash: 'hashedpassword',
    });
    customerUserId = customerUser._id.toString();

    const customerTokens = await authService.createTokens({
      id: customerUserId,
      role: 'customer',
      phone: customerUser.phone,
      isVerified: true,
    });
    customerToken = customerTokens.accessToken;

    // 3. Create Delivered Order for Shift Summary Test
    testTrackingCode = 'LGS-MOD-7788';
    const order = await Order.create({
      trackingCode: testTrackingCode,
      senderId: customerUserId,
      riderId: riderUserId,
      status: 'delivered',
      vehicleType: 'bike',
      paymentMethod: 'wallet',
      paymentStatus: 'paid',
      estimatedDistanceKm: 8.5,
      totalFareKobo: 300000,
      platformCommissionKobo: 60000,
      riderEarningKobo: 240000, // ₦2,400.00
      pickup: {
        address: 'Computer Village, Ikeja',
        landmark: 'Beside Slot',
        location: toGeoJsonPoint({ lat: 6.5933, lng: 3.3421 }),
        contactName: 'Kainul Stevano',
        contactPhone: '+2348180000002',
        pickupPin: '1234',
      },
      stops: [
        {
          sequenceNumber: 1,
          recipientName: 'Michael Chen',
          recipientPhone: '+2348031112233',
          dropoffAddress: 'Victoria Island, Lagos',
          dropoffLandmark: 'Beside Civic Centre',
          dropoffLocation: toGeoJsonPoint({ lat: 6.4312, lng: 3.4256 }),
          packageDescription: 'Business Documents',
          deliveryPin: '5678',
          status: 'delivered',
          deliveredAt: new Date(),
        },
      ],
      deliveredAt: new Date(),
      messages: [],
      incidents: [],
    });
    testOrderId = order._id.toString();
  });

  afterAll(async () => {
    await disconnectMongo();
    if (replSet) {
      await replSet.stop();
    }
  });

  describe('Module 1: Shift Earnings & Wallet Payouts', () => {
    it('GET /api/v1/riders/shift-summary returns today earnings, SLA, and settled deliveries', async () => {
      const res = await request(app)
        .get('/api/v1/riders/shift-summary')
        .set('Authorization', `Bearer ${riderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.todayEarningsKobo).toBe(240000);
      expect(res.body.tripsCompletedToday).toBe(1);
      expect(res.body.onTimeSlaPercent).toBe(99.4);
      expect(res.body.distanceCoveredKm).toBe(8.5);
      expect(res.body.bankDetails.bankName).toBe('Guaranty Trust Bank (GTB)');
      expect(res.body.settledTrips.length).toBe(1);
      expect(res.body.settledTrips[0].id).toBe(testTrackingCode);
    });

    it('POST /api/v1/riders/cashout rejects withdrawal if requested amount exceeds wallet balance', async () => {
      const res = await request(app)
        .post('/api/v1/riders/cashout')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({ amountKobo: 9999999 }); // Exceeds balance

      expect(res.status).toBe(402);
      expect(res.body.code).toBe('INSUFFICIENT_WALLET_BALANCE');
    });

    it('POST /api/v1/riders/cashout initiates bank withdrawal when wallet balance is sufficient', async () => {
      const res = await request(app)
        .post('/api/v1/riders/cashout')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          amountKobo: 20000, // ₦200.00
          accountNumber: '0123456789',
          bankCode: '058',
          accountName: 'Tariq Danladi',
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('payout transfer initiated');
      expect(res.body.amountKobo).toBe(20000);
      expect(res.body.payoutId).toBeDefined();

      // Verify wallet deduction
      const wallet = await Wallet.findOne({ userId: riderUserId });
      expect(wallet?.balanceKobo).toBe(30000); // 50,000 - 20,000
    });
  });

  describe('Module 2: In-App Courier-Customer Chat Thread', () => {
    it('POST /api/v1/orders/:orderId/messages appends a chat message to the order thread', async () => {
      const res = await request(app)
        .post(`/api/v1/orders/${testOrderId}/messages`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          text: 'I have arrived at your gate / entrance 📍',
          senderName: 'Tariq Danladi (Courier)',
        });

      expect(res.status).toBe(201);
      expect(res.body.chatMessage.text).toBe('I have arrived at your gate / entrance 📍');
      expect(res.body.chatMessage.senderRole).toBe('rider');
    });

    it('GET /api/v1/orders/:orderId/messages retrieves all chat messages for the order', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${testOrderId}/messages`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.trackingCode).toBe(testTrackingCode);
      expect(res.body.messages.length).toBeGreaterThanOrEqual(1);
      expect(res.body.messages[0].text).toContain('I have arrived');
    });
  });

  describe('Module 3: Emergency SOS & Road Incident Reporting', () => {
    it('POST /api/v1/riders/emergency/sos registers high-priority panic alert and returns emergency contacts', async () => {
      const res = await request(app)
        .post('/api/v1/riders/emergency/sos')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          lat: 6.5933,
          lng: 3.3421,
          speed: 32,
          batteryLevel: 85,
          orderId: testOrderId,
          timestamp: Date.now(),
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('Emergency SOS alert received');
      expect(res.body.sosTicket).toMatch(/^SOS-/);
      expect(res.body.emergencyContacts.policeAmbulance).toBe('112');
      expect(res.body.emergencyContacts.bayniksDispatchOps).toBe('+2348002296457');
    });

    it('POST /api/v1/riders/incidents logs road incident on the order and returns ticket', async () => {
      const res = await request(app)
        .post('/api/v1/riders/incidents')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          incidentType: 'breakdown',
          description: 'Punctured rear tire on Third Mainland Bridge',
          orderId: testOrderId,
          lat: 6.5122,
          lng: 3.3891,
          timestamp: Date.now(),
        });

      expect(res.status).toBe(201);
      expect(res.body.incidentTicket).toMatch(/^INC-/);
      expect(res.body.status).toBe('investigating');

      // Verify incident appended to order
      const order = await Order.findById(testOrderId);
      expect(order).toBeDefined();
      expect(order!.incidents.length).toBe(1);
      expect(order!.incidents[0]?.incidentType).toBe('breakdown');
    });
  });
});
