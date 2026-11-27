import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const redisMemory = new Map<string, string>();
const mockRedisClient = {
  set: vi.fn(async (key: string, val: string) => {
    redisMemory.set(key, val);
    return 'OK';
  }),
  get: vi.fn(async (key: string) => redisMemory.get(key) || null),
  geoadd: vi.fn(async () => 1),
  zrem: vi.fn(async () => 1),
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
import { User, Order, RiderProfile, Wallet } from '../models';
import { authService } from '../services/auth.service';
import { toGeoJsonPoint } from '@logistics/shared-types';

const app = createApp();

describe('Rider Live Backend API Wiring (Preferences, Notifications, Scheduled Orders, Ratings & Disputes)', () => {
  let replSet: MongoMemoryReplSet;
  let riderToken: string;
  let riderUserId: string;
  let customerUserId: string;
  let deliveredOrderId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await connectMongo(replSet.getUri());

    const riderUser = await User.create({
      fullName: 'Evans King',
      phone: '+2348190000011',
      email: 'evans.king@bayniks.ng',
      role: 'rider',
      isVerified: true,
      passwordHash: 'hashedpassword',
    });
    riderUserId = riderUser._id.toString();

    const tokens = await authService.createTokens({
      id: riderUserId,
      role: 'rider',
      phone: riderUser.phone,
      isVerified: true,
    });
    riderToken = tokens.accessToken;

    await RiderProfile.create({
      userId: riderUserId,
      vehicleType: 'bike',
      plateNumber: 'LSR-224-KX',
      ridersCardNumber: 'LASRERA-224',
      ridersCardDocumentUrl: 'https://cdn.bayniks.ng/card.jpg',
      status: 'offline',
      kycStatus: 'approved',
      lastLocation: toGeoJsonPoint({ lat: 6.5933, lng: 3.3421 }),
    });

    await Wallet.create({
      userId: riderUserId,
      balanceKobo: 120000,
      escrowLockedKobo: 0,
    });

    const customerUser = await User.create({
      fullName: 'Bisi Adebayo',
      phone: '+2348190000022',
      role: 'customer',
      isVerified: true,
      passwordHash: 'hashedpassword',
    });
    customerUserId = customerUser._id.toString();

    const order = await Order.create({
      trackingCode: 'LGS-LIVE-101',
      senderId: customerUserId,
      riderId: riderUserId,
      vehicleType: 'bike',
      paymentMethod: 'wallet',
      paymentStatus: 'paid',
      status: 'delivered',
      estimatedDistanceKm: 5.4,
      totalFareKobo: 250000,
      platformCommissionKobo: 50000,
      riderEarningKobo: 200000,
      deliveredAt: new Date(),
      pickup: {
        address: 'Otigba St, Ikeja',
        landmark: 'Computer Village',
        location: toGeoJsonPoint({ lat: 6.5933, lng: 3.3421 }),
        contactName: 'Sarah Johnson',
        contactPhone: '+2348021112233',
        pickupPin: '4829',
      },
      stops: [
        {
          sequenceNumber: 1,
          recipientName: 'Bisi Adebayo',
          recipientPhone: '+2348034445566',
          dropoffAddress: 'Victoria Island, Lagos',
          dropoffLandmark: 'Civic Centre',
          dropoffLocation: toGeoJsonPoint({ lat: 6.4312, lng: 3.4256 }),
          packageDescription: 'Electronics parcel',
          deliveryPin: '7482',
          status: 'delivered',
        },
      ],
    });
    deliveredOrderId = order._id.toString();

    await Order.create({
      trackingCode: 'LGS-SCH-202',
      senderId: customerUserId,
      riderId: null,
      vehicleType: 'bike',
      paymentMethod: 'wallet',
      paymentStatus: 'paid',
      status: 'searching_rider',
      scheduledFor: new Date(Date.now() + 3600 * 1000),
      estimatedDistanceKm: 7.2,
      totalFareKobo: 320000,
      platformCommissionKobo: 64000,
      riderEarningKobo: 256000,
      pickup: {
        address: 'Maryland Mall, Ikeja',
        landmark: 'Main Gate',
        location: toGeoJsonPoint({ lat: 6.5718, lng: 3.3666 }),
        contactName: 'Tunde',
        contactPhone: '+2348090001122',
        pickupPin: '1234',
      },
      stops: [
        {
          sequenceNumber: 1,
          recipientName: 'Kemi',
          recipientPhone: '+2348090003344',
          dropoffAddress: 'Admiralty Way, Lekki',
          dropoffLandmark: 'Phase 1 Gate',
          dropoffLocation: toGeoJsonPoint({ lat: 6.4474, lng: 3.4723 }),
          packageDescription: 'Scheduled box',
          deliveryPin: '5678',
          status: 'pending',
        },
      ],
    });
  });

  afterAll(async () => {
    await disconnectMongo();
    await replSet.stop();
  });

  it('persists vehicles, savedAddresses, bankDetails & preferences via PATCH /api/v1/riders/preferences', async () => {
    const res = await request(app)
      .patch('/api/v1/riders/preferences')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({
        fullName: 'Evans King Pro',
        email: 'evans.pro@bayniks.ng',
        homeDepot: 'Ikeja Commercial Hub',
        bankDetails: {
          bankCode: '044',
          bankName: 'Access Bank Plc',
          accountNumber: '0011223344',
          accountName: 'EVANS KING PRO',
        },
        vehicles: [
          { id: 'veh-1', plate: 'LSR-224-KX', description: 'Bajaj Boxer 2024', isActive: false },
          { id: 'veh-2', plate: 'KJA-908-AB', description: 'TVS Apache 2025', isActive: true },
        ],
        savedAddresses: [
          { id: 'home', label: 'Home', address: 'Maryland, Ikeja, Lagos', lat: 6.5718, lng: 3.3666 },
          { id: 'fav', label: 'Favourite', address: 'Computer Village, Ikeja', lat: 6.5933, lng: 3.3421 },
        ],
        preferences: {
          autoConfirm: false,
          preferredMapEngine: 'maplibre',
          dispatchRadiusKm: 6,
          defaultNavApp: 'waze',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.profile.plateNumber).toBe('KJA-908-AB');
    expect(res.body.profile.bankDetails.accountNumber).toBe('0011223344');
    expect(res.body.profile.vehicles).toHaveLength(2);
    expect(res.body.profile.savedAddresses).toHaveLength(2);
    expect(res.body.profile.preferences.preferredMapEngine).toBe('maplibre');
  });

  it('hydrates live earningsPeriods, activityWeeks, recentHistory & notifications on GET /api/v1/riders/shift-summary', async () => {
    const res = await request(app)
      .get('/api/v1/riders/shift-summary')
      .set('Authorization', `Bearer ${riderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.todayEarningsKobo).toBe(200000);
    expect(res.body.bankDetails.bankName).toBe('Access Bank Plc');
    expect(res.body.vehicles).toHaveLength(2);
    expect(res.body.earningsPeriods).toHaveLength(4);
    expect(res.body.activityWeeks).toHaveLength(4);
    expect(res.body.recentHistory[0].trackingCode).toBe('LGS-LIVE-101');
    expect(res.body.notifications.length).toBeGreaterThanOrEqual(1);
  });

  it('returns live inbox notifications and scheduled orders matching bike class', async () => {
    const notifRes = await request(app)
      .get('/api/v1/riders/notifications')
      .set('Authorization', `Bearer ${riderToken}`);

    expect(notifRes.status).toBe(200);
    expect(notifRes.body.notifications.some((n: any) => n.category === 'KYC')).toBe(true);

    const schRes = await request(app)
      .get('/api/v1/riders/scheduled-orders')
      .set('Authorization', `Bearer ${riderToken}`);

    expect(schRes.status).toBe(200);
    expect(schRes.body.orders.some((o: any) => o.trackingCode === 'LGS-SCH-202')).toBe(true);
  });

  it('records passenger rating and support dispute ticket on /api/v1/orders/:orderId', async () => {
    const rateRes = await request(app)
      .post(`/api/v1/orders/${deliveredOrderId}/rate-passenger`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ rating: 5, comment: 'Smooth handover' });

    expect(rateRes.status).toBe(200);
    expect(rateRes.body.passengerRating.rating).toBe(5);

    const disputeRes = await request(app)
      .post(`/api/v1/orders/${deliveredOrderId}/disputes`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ topic: 'Price lower than expected', details: 'Waiting 15m surcharge review' });

    expect(disputeRes.status).toBe(201);
    expect(disputeRes.body.ticketId).toMatch(/^DIS-/);
    expect(disputeRes.body.status).toBe('open');
  });

  it('registers Android FCM push token via POST /api/v1/riders/push-token and caches in Redis', async () => {
    const pushRes = await request(app)
      .post('/api/v1/riders/push-token')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ token: 'fcm-android-device-token-12345', platform: 'android' });

    expect(pushRes.status).toBe(200);
    expect(pushRes.body.channelId).toBe('bayniks_dispatch_alerts');
    const savedProfile = await RiderProfile.findOne({ userId: riderUserId }).lean();
    expect(savedProfile?.fcmToken).toBe('fcm-android-device-token-12345');
    expect(savedProfile?.pushPlatform).toBe('android');
  });
});

