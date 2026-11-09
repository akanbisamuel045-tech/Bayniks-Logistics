import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectMongo, disconnectMongo } from '../config/db';
import { getRedisClient, closeRedis } from '../config/redis';
import { User, Order, Wallet, WalletTransaction } from '../models';
import { authService } from '../services/auth.service';
import { vendorService } from '../services/vendor.service';

const app = createApp();

describe('Stage 17: Business Vendor Portal & Bulk CSV Multi-Stop Order Upload', () => {
  let vendorToken: string;
  let vendorUserId: string;

  beforeAll(async () => {
    await connectMongo();
    await User.deleteMany({ phone: { $regex: /^\+234813/ } });
    await Order.deleteMany({ 'pickup.contactPhone': '+2348139990001' });

    // Create Verified Vendor User
    const vendorUser = await User.create({
      fullName: 'Boutique Lagos Hub',
      phone: '+2348139990001',
      role: 'vendor',
      isVerified: true,
      passwordHash: 'hashedpassword',
    });
    vendorUserId = vendorUser._id.toString();

    const vendorTokens = await authService.createTokens({
      id: vendorUserId,
      role: 'vendor',
      phone: vendorUser.phone,
      isVerified: true,
    });
    vendorToken = vendorTokens.accessToken;

    // Initialize clean wallet with 0 balance
    await Wallet.deleteMany({ userId: vendorUser._id });
    await Wallet.create({
      userId: vendorUser._id,
      balanceKobo: 0,
      escrowLockedKobo: 0,
    });
  });

  afterAll(async () => {
    await User.deleteMany({ phone: { $regex: /^\+234813/ } });
    await Order.deleteMany({ senderId: vendorUserId });
    await Wallet.deleteMany({ userId: vendorUserId });
    await WalletTransaction.deleteMany({ walletUserId: vendorUserId });
    await closeRedis();
    await disconnectMongo();
  });

  describe('1. In-Memory CSV Parsing & Nigerian Street Normalization', () => {
    it('normalizes local Nigerian phone formats to strict E.164 and resolves Lagos coordinates', () => {
      const csv = `batchGroupKey,recipientName,recipientPhone,dropoffAddress,dropoffLandmark,packageDescription,packageSize
RUN-1,Amaka Obi,08012345678,"14 Allen Avenue, Ikeja",Opposite Slot,Silk Dress,small
RUN-1,Chidi Eze,2348098765432,"Admiralty Way, Lekki",Near Ebeano Supermarket,Designer Shoes,medium
RUN-1,Babajide Sanwo,09033334444,"Broad Street, Marina",Opposite CMS Bookshop,Legal Documents,small`;

      const result = vendorService.parseAndValidateVendorCsv(csv);

      expect(result.errors).toHaveLength(0);
      expect(result.validRows).toHaveLength(3);
      expect(result.totalParsed).toBe(3);

      // Verify E.164 phone normalizations
      expect(result.validRows[0]?.recipientPhone).toBe('+2348012345678');
      expect(result.validRows[1]?.recipientPhone).toBe('+2348098765432');
      expect(result.validRows[2]?.recipientPhone).toBe('+2349033334444');

      // Verify Lagos Gazetteer landmark coordinate resolution
      // Ikeja coords ~ 6.5933, 3.3421
      expect(result.validRows[0]?.lat).toBeCloseTo(6.5933, 2);
      expect(result.validRows[0]?.lng).toBeCloseTo(3.3421, 2);
      // Lekki coords ~ 6.4474, 3.4723
      expect(result.validRows[1]?.lat).toBeCloseTo(6.4474, 2);
      expect(result.validRows[1]?.lng).toBeCloseTo(3.4723, 2);
    });

    it('enforces mandatory Nigerian landmark and catches invalid rows without crashing', () => {
      const csv = `batchGroupKey,recipientName,recipientPhone,dropoffAddress,dropoffLandmark,packageDescription
RUN-1,Tolu Davies,08055556666,Victoria Island,,Perfume
RUN-1,Kemi Ade,invalid-phone,"Awolowo Road, Ikoyi",Beside Zenith Bank,Watch`;

      const result = vendorService.parseAndValidateVendorCsv(csv);

      expect(result.validRows).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);

      const landmarkError = result.errors.find((e) => e.field === 'dropoffLandmark');
      expect(landmarkError).toBeDefined();
      expect(landmarkError?.message).toContain('Mandatory Nigerian landmark is required');

      const phoneError = result.errors.find((e) => e.field === 'recipientPhone');
      expect(phoneError).toBeDefined();
      expect(phoneError?.message).toContain('Invalid Nigerian phone number format');
    });

    it('POST /api/v1/vendor/parse-csv validates raw CSV input over HTTP', async () => {
      const csvText = `batchGroupKey,recipientName,recipientPhone,dropoffAddress,dropoffLandmark
RUN-1,Funke Akindele,08077778888,Sabo Yaba,Behind Ozone Cinema`;

      const res = await request(app)
        .post('/api/v1/vendor/parse-csv')
        .send({ csvText });

      expect(res.status).toBe(200);
      expect(res.body.validRows).toHaveLength(1);
      expect(res.body.validRows[0].recipientPhone).toBe('+2348077778888');
      expect(res.body.validRows[0].lat).toBeCloseTo(6.5186, 2); // Yaba
    });
  });

  describe('2. Motorcycle Capacity Auto-Chunking (Max 5 Stops per Bike Run)', () => {
    it('automatically chunks > 5 stops into sub-runs (RUN-1-A, RUN-1-B)', () => {
      const rows = Array.from({ length: 8 }, (_, i) => ({
        batchGroupKey: 'RUN-1',
        recipientName: `Customer ${i + 1}`,
        recipientPhone: `+234801111222${i}`,
        dropoffAddress: `Address ${i + 1}`,
        dropoffLandmark: `Landmark ${i + 1} Ikeja`,
        packageDescription: `Item ${i + 1}`,
        packageSize: 'medium' as const,
        lat: 6.5933,
        lng: 3.3421,
      }));

      const chunks = vendorService.groupAndChunkRows(rows);

      expect(chunks).toHaveLength(2);
      expect(chunks[0]?.batchGroupKey).toBe('RUN-1-A');
      expect(chunks[0]?.stops).toHaveLength(5);
      expect(chunks[1]?.batchGroupKey).toBe('RUN-1-B');
      expect(chunks[1]?.stops).toHaveLength(3);
    });
  });

  describe('3. Batch Fare Estimate Calculation', () => {
    it('POST /api/v1/vendor/batch-estimate computes server-authoritative fares per motorcycle run', async () => {
      const payload = {
        pickup: {
          address: 'Warehouse Hub, 10 Mobolaji Bank Anthony Way, Ikeja',
          landmark: 'Opposite Ikeja General Hospital',
          location: { lat: 6.5933, lng: 3.3421 },
          contactName: 'Lagos Warehouse Manager',
          contactPhone: '+2348139990001',
        },
        rows: [
          {
            batchGroupKey: 'RUN-MAIN',
            recipientName: 'Recipient One',
            recipientPhone: '+2348022223333',
            dropoffAddress: 'Maryland Mall, Maryland, Lagos',
            dropoffLandmark: 'Inside Maryland Mall Food Court',
            packageDescription: 'Electronics',
            packageSize: 'small' as const,
            lat: 6.5722,
            lng: 3.3678,
          },
          {
            batchGroupKey: 'RUN-MAIN',
            recipientName: 'Recipient Two',
            recipientPhone: '+2348033334444',
            dropoffAddress: 'Admiralty Way, Lekki Phase 1',
            dropoffLandmark: 'Beside Tastee Fried Chicken',
            packageDescription: 'Skincare pack',
            packageSize: 'medium' as const,
            lat: 6.4474,
            lng: 3.4723,
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/vendor/batch-estimate')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.totalRunsCount).toBe(1);
      expect(res.body.totalStopsCount).toBe(2);
      expect(res.body.grandTotalFareKobo).toBeGreaterThan(0);
      expect(res.body.runs).toHaveLength(1);
      expect(res.body.runs[0].stopsCount).toBe(2);
      expect(res.body.runs[0].estimatedFareKobo).toBe(res.body.grandTotalFareKobo);
    });
  });

  describe('4. Atomic Wallet Balance Guard & Batch Order Creation', () => {
    const batchPayload = {
      pickup: {
        address: 'Warehouse Hub, 10 Mobolaji Bank Anthony Way, Ikeja',
        landmark: 'Opposite Ikeja General Hospital',
        location: { lat: 6.5933, lng: 3.3421 },
        contactName: 'Lagos Warehouse Manager',
        contactPhone: '+2348139990001',
      },
      rows: [
        {
          batchGroupKey: 'BATCH-ALPHA',
          recipientName: 'Customer One',
          recipientPhone: '+2348055551111',
          dropoffAddress: 'Allen Avenue, Ikeja',
          dropoffLandmark: 'Near Alausa Secretariat',
          packageDescription: 'Fashion Box',
          packageSize: 'small' as const,
          lat: 6.5933,
          lng: 3.3421,
        },
      ],
      paymentMethod: 'wallet' as const,
    };

    it('rejects batch creation with 402 INSUFFICIENT_WALLET_BALANCE when wallet balance is insufficient, writing 0 orders', async () => {
      // Wallet is currently 0
      const res = await request(app)
        .post('/api/v1/vendor/batch-create')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(batchPayload);

      expect(res.status).toBe(402);
      expect(res.body.code).toBe('INSUFFICIENT_WALLET_BALANCE');
      expect(res.body.error).toContain('Insufficient wallet balance');

      // Verify ZERO orders were written to MongoDB (atomic all-or-nothing guarantee)
      const count = await Order.countDocuments({ senderId: vendorUserId });
      expect(count).toBe(0);
    });

    it('successfully creates batch orders and locks escrow when wallet is funded', async () => {
      // Fund vendor wallet with ₦50,000 (5,000,000 kobo)
      await Wallet.findOneAndUpdate(
        { userId: vendorUserId },
        { balanceKobo: 5000000, escrowLockedKobo: 0 }
      );

      const res = await request(app)
        .post('/api/v1/vendor/batch-create')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(batchPayload);

      expect(res.status).toBe(201);
      expect(res.body.summary.totalRunsCount).toBe(1);
      expect(res.body.summary.totalStopsCount).toBe(1);
      expect(res.body.summary.runs[0].orderId).toBeDefined();
      expect(res.body.summary.runs[0].trackingCode).toMatch(/^LGS-\d{6}$/);

      const orderId = res.body.summary.runs[0].orderId;
      const createdOrder = await Order.findById(orderId);
      expect(createdOrder).not.toBeNull();
      expect(createdOrder?.status).toBe('searching_rider');
      expect(createdOrder?.paymentStatus).toBe('paid');
      expect(createdOrder?.pickup.pickupPin).toMatch(/^\d{4}$/);
      expect(createdOrder?.stops[0]?.deliveryPin).toMatch(/^\d{4}$/);

      // Verify wallet balance deduction & escrow lock
      const wallet = await Wallet.findOne({ userId: vendorUserId });
      expect(wallet).not.toBeNull();
      expect(wallet!.escrowLockedKobo).toBe(res.body.summary.grandTotalFareKobo);
      expect(wallet!.balanceKobo).toBe(5000000 - res.body.summary.grandTotalFareKobo);

      // Verify WalletTransaction audit trail
      const tx = await WalletTransaction.findOne({ orderId: createdOrder?._id, type: 'escrow_hold' });
      expect(tx).not.toBeNull();
      expect(tx?.status).toBe('success');
      expect(tx?.amountKobo).toBe(res.body.summary.grandTotalFareKobo);
    });
  });

  describe('5. Vendor Active Manifest & Telemetry Endpoint', () => {
    it('GET /api/v1/vendor/orders returns active orders with pickup, stops, and tracking status', async () => {
      const res = await request(app)
        .get('/api/v1/vendor/orders')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.orders)).toBe(true);
      expect(res.body.orders.length).toBeGreaterThanOrEqual(1);

      const first = res.body.orders[0];
      expect(first.trackingCode).toMatch(/^LGS-\d{6}$/);
      expect(first.pickup.landmark).toBe('Opposite Ikeja General Hospital');
      expect(first.stops[0].dropoffLandmark).toBe('Near Alausa Secretariat');
    });
  });
});

