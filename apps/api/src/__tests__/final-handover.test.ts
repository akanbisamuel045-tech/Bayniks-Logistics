import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createApp } from '../app';
import { connectMongo, disconnectMongo } from '../config/db';
import { getRedisClient, closeRedis } from '../config/redis';
import { seedDemoEcosystem, SeededDemoResult } from '../scripts/seed-demo';
import { User, RiderProfile, Order, Wallet, FleetSplitRule, PayoutTransaction } from '../models';

const app = createApp();

describe('Stage 22: Final Production Launch Readiness, 1-Command Demo Seeder & Master Handover', () => {
  let seededData: SeededDemoResult;

  beforeAll(async () => {
    await connectMongo();
    getRedisClient();
  });

  afterAll(async () => {
    await closeRedis();
    await disconnectMongo();
  });

  describe('Suite 1: Interactive Multi-Actor Demo Seeder & Idempotency Proof', () => {
    it('executes seedDemoEcosystem() first time and populates entire Lagos ecosystem', async () => {
      seededData = await seedDemoEcosystem({ closeConnections: false });

      expect(seededData).toBeDefined();
      expect(seededData.users.admin).toBeDefined();
      expect(seededData.users.fleetOwner).toBeDefined();
      expect(seededData.users.vendor).toBeDefined();
      expect(seededData.users.customer).toBeDefined();
      expect(seededData.users.riderTariq).toBeDefined();
      expect(seededData.users.riderUsman).toBeDefined();
      expect(seededData.users.riderChinedu).toBeDefined();
      expect(seededData.orders.liveOrder).toBeDefined();
      expect(seededData.orders.doneOrder).toBeDefined();
      expect(seededData.tokens.admin).toBeDefined();
      expect(seededData.tokens.customer).toBeDefined();
    });

    it('executes seedDemoEcosystem() a second time WITHOUT duplicate key errors (Idempotency Guarantee)', async () => {
      const secondRun = await seedDemoEcosystem({ closeConnections: false });

      expect(secondRun.users.admin.phone).toBe('+2348000000001');
      expect(secondRun.users.fleetOwner.phone).toBe('+2348000000002');
      expect(secondRun.users.vendor.phone).toBe('+2348000000003');
      expect(secondRun.users.customer.phone).toBe('+2348123456789');
      expect(secondRun.orders.liveOrder.trackingCode).toBe('BYN-LIVE01');
      expect(secondRun.orders.doneOrder.trackingCode).toBe('BYN-DONE02');
    });

    it('verifies funded wallet balances in integer Kobo (Golden Rule 6)', async () => {
      const fleetWallet = await Wallet.findOne({ userId: seededData.users.fleetOwner._id });
      const vendorWallet = await Wallet.findOne({ userId: seededData.users.vendor._id });
      const customerWallet = await Wallet.findOne({ userId: seededData.users.customer._id });
      const tariqWallet = await Wallet.findOne({ userId: seededData.users.riderTariq._id });

      expect(fleetWallet?.balanceKobo).toBe(12000000); // ₦120,000.00
      expect(vendorWallet?.balanceKobo).toBe(8500000);   // ₦85,000.00
      expect(customerWallet?.balanceKobo).toBe(4520000); // ₦45,200.00
      expect(tariqWallet?.balanceKobo).toBe(3500000);    // ₦35,000.00
    });

    it('verifies 3 riders configuration, fleet link rules, and Redis RAM state (Golden Rules 4 & 5)', async () => {
      const redis = getRedisClient();

      // Tariq Danladi (busy, fleet-linked 70/30, live telemetry on Third Mainland Bridge)
      const tariqProfile = await RiderProfile.findOne({ userId: seededData.users.riderTariq._id });
      expect(tariqProfile?.status).toBe('busy');
      expect(tariqProfile?.plateNumber).toBe('KJA-491-AA');
      expect(tariqProfile?.fleetOwnerId?.toString()).toBe(seededData.users.fleetOwner._id.toString());

      const splitRule = await FleetSplitRule.findOne({
        fleetOwnerId: seededData.users.fleetOwner._id,
        riderUserId: seededData.users.riderTariq._id,
      });
      expect(splitRule?.riderSharePercent).toBe(70);
      expect(splitRule?.fleetOwnerSharePercent).toBe(30);

      // Verify Tariq live telemetry in Redis RAM
      const tariqTelemetry = await redis.hgetall(`rider:telemetry:${seededData.users.riderTariq._id}`);
      expect(tariqTelemetry.lat).toBe('6.5085');
      expect(tariqTelemetry.lng).toBe('3.3892');
      expect(tariqTelemetry.trackingCode).toBe('BYN-LIVE01');

      // Usman Bello (available, indexed in Redis GEO set at Ikeja City Mall)
      const usmanProfile = await RiderProfile.findOne({ userId: seededData.users.riderUsman._id });
      expect(usmanProfile?.status).toBe('available');
      expect(usmanProfile?.plateNumber).toBe('LND-310-BB');

      const pos = await redis.geopos('riders:available:locations', seededData.users.riderUsman._id.toString());
      expect(pos).toBeDefined();
      expect(pos[0]).toBeDefined();
      // Redis returns [lng, lat] with high precision
      expect(Number(pos[0]![0])).toBeCloseTo(3.3515, 2);
      expect(Number(pos[0]![1])).toBeCloseTo(6.6018, 2);

      // Chinedu Okafor (pending KYC, ready for 1-click admin approval)
      const chineduProfile = await RiderProfile.findOne({ userId: seededData.users.riderChinedu._id });
      expect(chineduProfile?.kycStatus).toBe('pending');
      expect(chineduProfile?.status).toBe('offline');
      expect(chineduProfile?.plateNumber).toBe('MUS-882-XY');
    });

    it('verifies settled 80/20 order BYN-DONE02 and payout records', async () => {
      const doneOrder = await Order.findOne({ trackingCode: 'BYN-DONE02' });
      expect(doneOrder?.status).toBe('delivered');
      expect(doneOrder?.payoutStatus).toBe('settled');
      expect(doneOrder?.totalFareKobo).toBe(250000);
      expect(doneOrder?.platformCommissionKobo).toBe(50000); // 20%
      expect(doneOrder?.riderEarningKobo).toBe(200000);       // 80%

      const payouts = await PayoutTransaction.find({
        payoutId: { $in: ['PAYOUT-DONE02-TARIQ', 'PAYOUT-DONE02-FLEET'] },
      });
      expect(payouts.length).toBe(2);
      const tariqPayout = payouts.find((p) => p.payoutId === 'PAYOUT-DONE02-TARIQ');
      const fleetPayout = payouts.find((p) => p.payoutId === 'PAYOUT-DONE02-FLEET');
      expect(tariqPayout?.amountKobo).toBe(140000); // 70% of 200,000 = ₦1,400.00
      expect(fleetPayout?.amountKobo).toBe(60000);   // 30% of 200,000 = ₦600.00
      expect(tariqPayout?.status).toBe('success');
      expect(fleetPayout?.status).toBe('success');
    });
  });

  describe('Suite 2: Zero-Install Live Public Tracking Endpoint (BYN-LIVE01)', () => {
    it('GET /api/v1/orders/track/BYN-LIVE01 returns 200 OK with live telemetry and anti-fraud redacted PINs', async () => {
      const res = await request(app)
        .get('/api/v1/orders/track/BYN-LIVE01')
        .expect(200);

      expect(res.body.trackingCode).toBe('BYN-LIVE01');
      expect(res.body.status).toBe('in_transit');
      expect(res.body.vehicleType).toBe('bike');

      // Assigned Rider Information
      expect(res.body.assignedRider).toBeDefined();
      expect(res.body.assignedRider.fullName).toBe('Tariq Danladi');
      expect(res.body.assignedRider.plateNumber).toBe('KJA-491-AA');

      // Live Telemetry from Redis RAM
      expect(res.body.liveTelemetry).toBeDefined();
      expect(res.body.liveTelemetry.lat).toBe(6.5085);
      expect(res.body.liveTelemetry.lng).toBe(3.3892);
      expect(res.body.liveTelemetry.bearing).toBe(135);
      expect(res.body.liveTelemetry.speed).toBe(48.5);

      // Pickup & Dropoff Stops
      expect(res.body.pickup).toBeDefined();
      expect(res.body.pickup.address).toContain('Commercial Avenue');
      expect(res.body.stops).toHaveLength(1);
      expect(res.body.stops[0].recipientName).toBe('Dr. Folake Adeyemi');

      // Strict Anti-Fraud Redaction (PINs must NEVER be exposed publicly)
      expect(res.body.pickup.pickupPin).toBeUndefined();
      expect(res.body.pickupPin).toBeUndefined();
      expect(res.body.stops[0].deliveryPin).toBeUndefined();
    });
  });

  describe('Suite 3: Master Production Runbook & Documentation Verification', () => {
    it('verifies root README.md exists and comprehensively documents all platform workflows', () => {
      const readmePath = path.resolve(__dirname, '../../../../README.md');
      expect(fs.existsSync(readmePath)).toBe(true);

      const content = fs.readFileSync(readmePath, 'utf-8');
      expect(content).toContain('Bayniks Logistics');
      expect(content).toContain('npm run demo:seed');
      expect(content).toContain('docker-compose.prod.yml');
      expect(content).toContain('apk:debug');
      expect(content).toContain('twa-package-guide.mjs');
      expect(content).toContain('Golden Rule 4');
      expect(content).toContain('Golden Rule 5');
      expect(content).toContain('Golden Rule 6');
      expect(content.length).toBeGreaterThan(2000);
    });
  });
});

