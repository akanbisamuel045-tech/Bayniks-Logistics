import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectMongo, disconnectMongo } from '../config/db';
import { getRedisClient, closeRedis } from '../config/redis';
import { User, RiderProfile, Wallet } from '../models';
import { authService } from '../services/auth.service';

describe('Stage 4: Rider KYC, Vehicle Onboarding & Fleet Owner Linking', () => {
  const app = createApp();
  const redis = getRedisClient();

  let fleetOwnerUser: any;
  let fleetOwnerToken: string;

  let adminUser: any;
  let adminToken: string;

  let rider1User: any;
  let rider1Token: string;

  let rider2User: any;
  let rider2Token: string;

  const sharedPlate = `KJA-${Math.floor(100 + Math.random() * 899)}-XY`;

  beforeAll(async () => {
    await connectMongo();
    await User.syncIndexes();
    await RiderProfile.syncIndexes();
    await Wallet.syncIndexes();

    await User.deleteMany({ phone: { $regex: /^\+234814/ } });
    await redis.del('riders:available:locations');

    // 1. Create Verified Fleet Owner
    const fleetOwnerPhone = '+2348140001001';
    fleetOwnerUser = await User.create({
      role: 'fleet_owner',
      fullName: 'Chief Alao Fleet Logistics',
      phone: fleetOwnerPhone,
      passwordHash: await authService.hashPassword('FleetPass123!'),
      isVerified: true,
    });
    const fleetTokens = await authService.createTokens({
      id: fleetOwnerUser._id.toString(),
      role: 'fleet_owner',
      phone: fleetOwnerUser.phone,
      isVerified: true,
    });
    fleetOwnerToken = fleetTokens.accessToken;

    // 2. Create Admin User
    const adminPhone = '+2348140001002';
    adminUser = await User.create({
      role: 'admin',
      fullName: 'System SuperAdmin',
      phone: adminPhone,
      passwordHash: await authService.hashPassword('AdminPass123!'),
      isVerified: true,
    });
    const adminTokens = await authService.createTokens({
      id: adminUser._id.toString(),
      role: 'admin',
      phone: adminUser.phone,
      isVerified: true,
    });
    adminToken = adminTokens.accessToken;

    // 3. Create Rider 1
    const rider1Phone = '+2348140001003';
    rider1User = await User.create({
      role: 'rider',
      fullName: 'Kayode Dispatcher',
      phone: rider1Phone,
      passwordHash: await authService.hashPassword('RiderPass123!'),
      isVerified: true,
    });
    const r1Tokens = await authService.createTokens({
      id: rider1User._id.toString(),
      role: 'rider',
      phone: rider1User.phone,
      isVerified: true,
    });
    rider1Token = r1Tokens.accessToken;

    // 4. Create Rider 2
    const rider2Phone = '+2348140001004';
    rider2User = await User.create({
      role: 'rider',
      fullName: 'Segun SecondRider',
      phone: rider2Phone,
      passwordHash: await authService.hashPassword('RiderPass456!'),
      isVerified: true,
    });
    const r2Tokens = await authService.createTokens({
      id: rider2User._id.toString(),
      role: 'rider',
      phone: rider2User.phone,
      isVerified: true,
    });
    rider2Token = r2Tokens.accessToken;
  });

  afterAll(async () => {
    if (rider1User?._id || rider2User?._id) {
      await RiderProfile.deleteMany({ userId: { $in: [rider1User?._id, rider2User?._id].filter(Boolean) } });
    }
    await User.deleteMany({ phone: { $regex: /^\+234814/ } });
    await disconnectMongo();
    await closeRedis();
  });

  it('1. onboards rider with vehicle info, links fleet owner, and prevents duplicate plate registration', async () => {
    // Rider 1 onboards and links fleet owner via phone
    const onboardRes1 = await request(app)
      .post('/api/v1/riders/onboard')
      .set('Authorization', `Bearer ${rider1Token}`)
      .send({
        vehicleType: 'bike',
        plateNumber: sharedPlate,
        ridersCardNumber: 'LASR-MVAA-00123',
        ridersCardDocumentUrl: 'https://storage.dispatch.ng/docs/mvaa-00123.pdf',
        vehiclePhotoUrl: 'https://storage.dispatch.ng/docs/bike-front.jpg',
        fleetInviteCodeOrPhone: fleetOwnerUser.phone,
      });

    expect(onboardRes1.status).toBe(201);
    expect(onboardRes1.body.profile.plateNumber).toBe(sharedPlate);
    expect(onboardRes1.body.profile.kycStatus).toBe('pending_review');
    expect(onboardRes1.body.profile.status).toBe('offline');
    expect(onboardRes1.body.profile.fleetOwnerId).toBe(fleetOwnerUser._id.toString());

    // Rider 2 attempts duplicate plate registration
    const onboardRes2 = await request(app)
      .post('/api/v1/riders/onboard')
      .set('Authorization', `Bearer ${rider2Token}`)
      .send({
        vehicleType: 'bike',
        plateNumber: sharedPlate.toLowerCase(), // testing normalization
        ridersCardNumber: 'LASR-MVAA-00456',
        ridersCardDocumentUrl: 'https://storage.dispatch.ng/docs/mvaa-00456.pdf',
      });

    expect(onboardRes2.status).toBe(409);
    expect(onboardRes2.body.code).toBe('DUPLICATE_PLATE_NUMBER');
  });

  it('2. blocks unapproved rider (kycStatus === "pending_review") from toggling status to available', async () => {
    const toggleRes = await request(app)
      .patch('/api/v1/riders/status')
      .set('Authorization', `Bearer ${rider1Token}`)
      .send({
        status: 'available',
        lat: 6.5997,
        lng: 3.3364,
      });

    expect(toggleRes.status).toBe(403);
    expect(toggleRes.body.code).toBe('KYC_NOT_APPROVED');

    // Verify rider is NOT in Redis geospatial index
    const redisResult = await redis.geopos('riders:available:locations', rider1User._id.toString());
    expect(redisResult[0]).toBeNull();
  });

  it('3. approves rider KYC via admin and syncs live position to Redis upon available toggle', async () => {
    // Admin approves Rider 1 KYC
    const adminReviewRes = await request(app)
      .patch(`/api/v1/admin/riders/${rider1User._id}/kyc`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'approve',
      });

    expect(adminReviewRes.status).toBe(200);
    expect(adminReviewRes.body.profile.kycStatus).toBe('approved');

    // Approved Rider 1 toggles status to available at Ikeja Computer Village
    const ikejaLat = 6.5997;
    const ikejaLng = 3.3364;

    const toggleRes = await request(app)
      .patch('/api/v1/riders/status')
      .set('Authorization', `Bearer ${rider1Token}`)
      .send({
        status: 'available',
        lat: ikejaLat,
        lng: ikejaLng,
      });

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.status).toBe('available');

    // Verify MongoDB: Golden Rule 4 [longitude, latitude]
    const profileInDb = await RiderProfile.findOne({ userId: rider1User._id });
    expect(profileInDb?.status).toBe('available');
    expect(profileInDb?.lastLocation.type).toBe('Point');
    expect(profileInDb?.lastLocation.coordinates[0]).toBe(ikejaLng); // Longitude
    expect(profileInDb?.lastLocation.coordinates[1]).toBe(ikejaLat); // Latitude

    // Verify Redis GEOSEARCH from Ikeja Under Bridge (within 3000m)
    const redisSearch = (await redis.call(
      'GEOSEARCH',
      'riders:available:locations',
      'FROMLONLAT',
      3.3380,
      6.5956,
      'BYRADIUS',
      3000,
      'M',
      'WITHDIST',
      'ASC'
    )) as Array<[string, string]>;

    const foundInRedis = redisSearch.some(([id]) => id === rider1User._id.toString());
    expect(foundInRedis).toBe(true);
  });

  it('4. cleans up Redis geospatial index when rider toggles status to offline', async () => {
    const offlineRes = await request(app)
      .patch('/api/v1/riders/status')
      .set('Authorization', `Bearer ${rider1Token}`)
      .send({
        status: 'offline',
        lat: 6.5997,
        lng: 3.3364,
      });

    expect(offlineRes.status).toBe(200);
    expect(offlineRes.body.status).toBe('offline');

    // Verify Redis position was removed
    const pos = await redis.geopos('riders:available:locations', rider1User._id.toString());
    expect(pos[0]).toBeNull();
  });

  it('5. allows fleet owners to inspect roster of all linked dispatch riders', async () => {
    const fleetRes = await request(app)
      .get('/api/v1/fleet/riders')
      .set('Authorization', `Bearer ${fleetOwnerToken}`);

    expect(fleetRes.status).toBe(200);
    expect(fleetRes.body.count).toBeGreaterThanOrEqual(1);

    const linkedRider = fleetRes.body.riders.find(
      (r: any) => r.userId._id === rider1User._id.toString()
    );
    expect(linkedRider).toBeDefined();
    expect(linkedRider.plateNumber).toBe(sharedPlate);
    expect(linkedRider.userId.fullName).toBe('Kayode Dispatcher');
  });
});
