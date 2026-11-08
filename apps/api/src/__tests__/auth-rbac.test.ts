import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectMongo, disconnectMongo } from '../config/db';
import { getRedisClient, closeRedis } from '../config/redis';
import { User, Wallet } from '../models';
import { otpService } from '../services/otp.service';

describe('Stage 3: Authentication, Nigerian Phone Normalization, OTP & RBAC', () => {
  const app = createApp();
  const redis = getRedisClient();

  beforeAll(async () => {
    await connectMongo();
    await User.syncIndexes();
    await Wallet.syncIndexes();
  });

  afterAll(async () => {
    await disconnectMongo();
    await closeRedis();
  });

  it('1. normalizes Nigerian phone formats and rejects duplicate registrations with 409 Conflict', async () => {
    const rawLocalPhone = '08031234567';
    const internationalPhone = '+2348031234567';

    // Cleanup phone before test
    await User.deleteMany({ phone: internationalPhone });

    // 1st signup with local format: 08031234567
    const res1 = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Tariq Alade',
      phone: rawLocalPhone,
      password: 'StrongPassword123!',
      role: 'customer',
    });

    expect(res1.status).toBe(201);
    expect(res1.body.user.phone).toBe(internationalPhone); // Normalized to +234

    // 2nd signup with explicit +234 format
    const res2 = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Tariq Duplicate',
      phone: internationalPhone,
      password: 'AnotherPassword456!',
      role: 'customer',
    });

    expect(res2.status).toBe(409);
    expect(res2.body.error).toContain('already exists');
  });

  it('2. atomically creates User and linked Wallet (0 kobo) inside replica set ACID transaction', async () => {
    const phone = '08099887766';
    const normalizedPhone = '+2348099887766';
    await User.deleteMany({ phone: normalizedPhone });

    const res = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Chidinma Okeke',
      phone,
      password: 'SecurePass789!',
      role: 'vendor',
    });

    expect(res.status).toBe(201);
    const userId = res.body.user.id;

    // Verify User in MongoDB
    const user = await User.findById(userId);
    expect(user).not.toBeNull();
    expect(user?.isVerified).toBe(false);

    // Verify linked Wallet initialized atomically with 0 kobo
    const wallet = await Wallet.findOne({ userId });
    expect(wallet).not.toBeNull();
    expect(wallet?.balanceKobo).toBe(0);
    expect(wallet?.escrowLockedKobo).toBe(0);
  });

  it('3. rejects self-registration for admin role to prevent privilege escalation', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Hacker Admin',
      phone: '08011223344',
      password: 'HackedPassword999!',
      role: 'admin',
    });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Admin accounts cannot be self-registered');
  });

  it('4. locks out OTP verification after 5 failed attempts (429) and successfully verifies with valid OTP', async () => {
    const phone = '08055443322';
    const normalizedPhone = '+2348055443322';
    await User.deleteMany({ phone: normalizedPhone });

    await request(app).post('/api/v1/auth/register').send({
      fullName: 'Ikenna Obi',
      phone,
      password: 'PassIkenna123!',
      role: 'rider',
    });

    // 4 Failed attempts with wrong OTP
    for (let i = 1; i <= 4; i++) {
      const failedRes = await request(app).post('/api/v1/auth/verify-otp').send({
        phone,
        otp: '000000',
      });
      expect(failedRes.status).toBe(400);
      expect(failedRes.body.error).toContain('Invalid or expired');
    }

    // 5th attempt locks out with 429 Too Many Requests
    const lockoutRes = await request(app).post('/api/v1/auth/verify-otp').send({
      phone,
      otp: '000000',
    });
    expect(lockoutRes.status).toBe(429);
    expect(lockoutRes.body.error).toContain('Too many failed attempts');

    // Re-generate OTP for valid test
    const newOtp = await otpService.generateAndSaveOtp(normalizedPhone);

    // Successful OTP verification
    const successRes = await request(app).post('/api/v1/auth/verify-otp').send({
      phone,
      otp: newOtp,
    });

    expect(successRes.status).toBe(200);
    expect(successRes.body.accessToken).toBeDefined();
    expect(successRes.body.refreshToken).toBeDefined();
    expect(successRes.body.user.isVerified).toBe(true);

    // Verify User record updated in MongoDB
    const updatedUser = await User.findOne({ phone: normalizedPhone });
    expect(updatedUser?.isVerified).toBe(true);
  });

  it('5. enforces RBAC guards: blocks customer from rider/admin routes and permits authorized roles', async () => {
    const customerPhone = '+2348077112233';
    const riderPhone = '+2348077445566';
    await User.deleteMany({ phone: { $in: [customerPhone, riderPhone] } });

    // Register & Verify Customer
    await request(app).post('/api/v1/auth/register').send({
      fullName: 'Customer Test',
      phone: customerPhone,
      password: 'CustomerPass123!',
      role: 'customer',
    });
    const customerOtp = otpService.getLatestMockOtp(customerPhone)!;
    const customerAuth = await request(app).post('/api/v1/auth/verify-otp').send({
      phone: customerPhone,
      otp: customerOtp,
    });
    const customerToken = customerAuth.body.accessToken;

    // Register & Verify Rider
    await request(app).post('/api/v1/auth/register').send({
      fullName: 'Rider Test',
      phone: riderPhone,
      password: 'RiderPass123!',
      role: 'rider',
    });
    const riderOtp = otpService.getLatestMockOtp(riderPhone)!;
    const riderAuth = await request(app).post('/api/v1/auth/verify-otp').send({
      phone: riderPhone,
      otp: riderOtp,
    });
    const riderToken = riderAuth.body.accessToken;

    // Customer accesses /probe/rider -> Expected: 403 Forbidden
    const forbiddenRes = await request(app)
      .get('/api/v1/auth/probe/rider')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.code).toBe('INSUFFICIENT_PERMISSIONS');

    // Rider accesses /probe/rider -> Expected: 200 OK
    const allowedRes = await request(app)
      .get('/api/v1/auth/probe/rider')
      .set('Authorization', `Bearer ${riderToken}`);
    expect(allowedRes.status).toBe(200);
    expect(allowedRes.body.message).toContain('Dispatch Rider area');

    // Rider accesses /probe/admin -> Expected: 403 Forbidden
    const adminForbidden = await request(app)
      .get('/api/v1/auth/probe/admin')
      .set('Authorization', `Bearer ${riderToken}`);
    expect(adminForbidden.status).toBe(403);

    // Unauthenticated access -> Expected: 401 Unauthorized
    const unauthRes = await request(app).get('/api/v1/auth/probe/rider');
    expect(unauthRes.status).toBe(401);
  });

  it('6. rotates refresh tokens in Redis and revokes token upon logout', async () => {
    const loginPhone = '+2348088990011';
    await User.deleteMany({ phone: loginPhone });

    // Register & Verify user
    await request(app).post('/api/v1/auth/register').send({
      fullName: 'Token Rotator',
      phone: loginPhone,
      password: 'RotatePass123!',
      role: 'customer',
    });
    const otp = otpService.getLatestMockOtp(loginPhone)!;
    const authRes = await request(app).post('/api/v1/auth/verify-otp').send({
      phone: loginPhone,
      otp,
    });

    const initialRefreshToken = authRes.body.refreshToken;

    // 1. Rotate Refresh Token
    const refreshRes = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: initialRefreshToken,
    });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeDefined();
    expect(refreshRes.body.refreshToken).toBeDefined();
    const newRefreshToken = refreshRes.body.refreshToken;

    // 2. Attempt to reuse initial refresh token -> Expected: 401 Unauthorized (single use rotation)
    const reuseRes = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: initialRefreshToken,
    });
    expect(reuseRes.status).toBe(401);

    // 3. Logout with new refresh token
    const logoutRes = await request(app).post('/api/v1/auth/logout').send({
      refreshToken: newRefreshToken,
    });
    expect(logoutRes.status).toBe(200);

    // 4. Attempt to use revoked refresh token -> Expected: 401 Unauthorized
    const afterLogoutRes = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: newRefreshToken,
    });
    expect(afterLogoutRes.status).toBe(401);
  });
});

