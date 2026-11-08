import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectMongo, disconnectMongo } from '../config/db';
import { getRedisClient, closeRedis } from '../config/redis';
import { User, Order, RiderProfile } from '../models';
import { authService } from '../services/auth.service';

const app = createApp();

describe('Stage 6: Order Creation, Security & Public Tracking Lookup', () => {
  let customerToken: string;
  let customerUserId: string;
  let vendorToken: string;
  let riderToken: string;

  beforeAll(async () => {
    await connectMongo();
    await User.deleteMany({ phone: { $regex: /^\+234819/ } });
    await RiderProfile.deleteMany({ plateNumber: { $regex: /KJA-777/ } });

    // 1. Create Verified Customer User
    const customerUser = await User.create({
      fullName: 'Tunde Bakare',
      phone: '+2348190001001',
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

    // 2. Create Verified Vendor User
    const vendorUser = await User.create({
      fullName: 'Boutique Express Vendor',
      phone: '+2348190001002',
      role: 'vendor',
      isVerified: true,
      passwordHash: 'hashedpassword',
    });
    const vendorTokens = await authService.createTokens({
      id: vendorUser._id.toString(),
      role: 'vendor',
      phone: vendorUser.phone,
      isVerified: true,
    });
    vendorToken = vendorTokens.accessToken;

    // 3. Create Rider User (should be forbidden from creating orders)
    const riderUser = await User.create({
      fullName: 'Suleiman Danjuma',
      phone: '+2348190001003',
      role: 'rider',
      isVerified: true,
      passwordHash: 'hashedpassword',
    });
    const riderTokens = await authService.createTokens({
      id: riderUser._id.toString(),
      role: 'rider',
      phone: riderUser.phone,
      isVerified: true,
    });
    riderToken = riderTokens.accessToken;
  });

  afterAll(async () => {
    if (customerUserId) {
      await Order.deleteMany({ senderId: customerUserId });
    }
    await User.deleteMany({ phone: { $regex: /^\+234819/ } });
    await disconnectMongo();
    await closeRedis();
  });

  // SUITE 1: Multi-stop order creation & GeoJSON Invariants
  describe('Suite 1: Multi-Stop Order Creation & GeoJSON Coordinates', () => {
    it('creates a 3-stop order and verifies GeoJSON [lng, lat] coordinate law (Golden Rule 4)', async () => {
      const orderPayload = {
        vehicleType: 'bike',
        paymentMethod: 'pay_on_pickup',
        pickup: {
          address: 'Computer Village, Otigba Street, Ikeja',
          landmark: 'Opposite Slot, beside Yellow Gate',
          location: { lat: 6.5933, lng: 3.3421 },
          contactName: 'Tunde Bakare',
          contactPhone: '08190001001',
        },
        stops: [
          {
            recipientName: 'Amina Bello',
            recipientPhone: '08029876543',
            dropoffAddress: 'Yaba College of Technology, Yaba',
            dropoffLandmark: 'Near Main Gate, Herbert Macaulay',
            dropoffLocation: { lat: 6.5186, lng: 3.3712 },
            packageDescription: 'Carton of laptop chargers',
          },
          {
            recipientName: 'Chinedu Eze',
            recipientPhone: '08035551234',
            dropoffAddress: 'National Stadium, Surulere',
            dropoffLandmark: 'Western Avenue, entrance gate',
            dropoffLocation: { lat: 6.4969, lng: 3.3615 },
            packageDescription: 'Sports jersey merchandise',
          },
          {
            recipientName: 'Folake Adeleke',
            recipientPhone: '08097778899',
            dropoffAddress: 'Adetokunbo Ademola, Victoria Island',
            dropoffLandmark: 'Opposite Eko Hotel Roundabout',
            dropoffLocation: { lat: 6.4281, lng: 3.4219 },
            packageDescription: 'Designer perfume package',
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderPayload);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Order created successfully');

      const createdOrder = res.body.order;
      expect(createdOrder).toBeDefined();

      // 1. Verify tracking code format (LGS-XXXXXX)
      expect(createdOrder.trackingCode).toMatch(/^LGS-\d{6}$/);

      // 2. Verify 4-digit numeric PINs
      expect(createdOrder.pickup.pickupPin).toMatch(/^\d{4}$/);
      expect(createdOrder.stops.length).toBe(3);
      for (const stop of createdOrder.stops) {
        expect(stop.deliveryPin).toMatch(/^\d{4}$/);
        expect(stop.status).toBe('pending');
      }

      // 3. Verify server-side pricing reconciliation
      expect(createdOrder.totalFareKobo).toBeGreaterThan(250000);
      expect(createdOrder.totalFareKobo % 5000).toBe(0); // ₦50 rounding
      expect(
        createdOrder.platformCommissionKobo + createdOrder.riderEarningKobo
      ).toBe(createdOrder.totalFareKobo);

      // 4. Inspect MongoDB document directly for Golden Rule 4 GeoJSON [lng, lat] ordering
      const dbOrder = await Order.findOne({ trackingCode: createdOrder.trackingCode });
      expect(dbOrder).not.toBeNull();

      // Pickup coordinates: [longitude, latitude]
      expect(dbOrder!.pickup.location.type).toBe('Point');
      expect(dbOrder!.pickup.location.coordinates[0]).toBe(3.3421); // Longitude first!
      expect(dbOrder!.pickup.location.coordinates[1]).toBe(6.5933); // Latitude second!

      // Stop coordinates: [longitude, latitude]
      expect(dbOrder!.stops[0]!.dropoffLocation.coordinates[0]).toBe(3.3712); // Longitude
      expect(dbOrder!.stops[0]!.dropoffLocation.coordinates[1]).toBe(6.5186); // Latitude

      expect(dbOrder!.stops[1]!.dropoffLocation.coordinates[0]).toBe(3.3615); // Longitude
      expect(dbOrder!.stops[1]!.dropoffLocation.coordinates[1]).toBe(6.4969); // Latitude

      expect(dbOrder!.stops[2]!.dropoffLocation.coordinates[0]).toBe(3.4219); // Longitude
      expect(dbOrder!.stops[2]!.dropoffLocation.coordinates[1]).toBe(6.4281); // Latitude
    });

    it('allows verified vendors to create orders', async () => {
      const vendorPayload = {
        vehicleType: 'van',
        paymentMethod: 'pay_on_delivery',
        pickup: {
          address: 'Trade Fair Complex, Ojo, Lagos',
          landmark: 'Hall 4, opposite entrance',
          location: { lat: 6.4592, lng: 3.2201 },
          contactName: 'Vendor Logistics Desk',
          contactPhone: '+2348190001002',
        },
        stops: [
          {
            recipientName: 'Kalu Electronics',
            recipientPhone: '+2348039991122',
            dropoffAddress: 'Alaba International Market, Ojo',
            dropoffLandmark: 'Electronics Line, Shop 42',
            dropoffLocation: { lat: 6.4619, lng: 3.1932 },
            packageDescription: '5 cartons of sound systems',
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(vendorPayload);

      expect(res.status).toBe(201);
      expect(res.body.order.vehicleType).toBe('van');
      expect(res.body.order.status).toBe('searching_rider');
    });
  });

  // SUITE 2: Anti-Fraud PIN Redaction on Public Tracking
  describe('Suite 2: Public Tracking Redaction vs Sender Order History', () => {
    let testTrackingCode: string;
    let testPickupPin: string;
    let testDeliveryPin: string;

    beforeAll(async () => {
      // Create an order for tracking tests
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          vehicleType: 'bike',
          paymentMethod: 'wallet',
          pickup: {
            address: 'Maryland Mall, Maryland, Lagos',
            landmark: 'Near front escalators',
            location: { lat: 6.5721, lng: 3.3683 },
            contactName: 'Tunde Bakare',
            contactPhone: '+2348190001001',
          },
          stops: [
            {
              recipientName: 'Sola Shittu',
              recipientPhone: '+2348051234567',
              dropoffAddress: 'Balogun Market, Lagos Island',
              dropoffLandmark: 'Cloth section, beside Central Mosque',
              dropoffLocation: { lat: 6.4531, lng: 3.3882 },
              packageDescription: 'Traditional fabric fabrics',
            },
          ],
        });

      testTrackingCode = res.body.order.trackingCode;
      testPickupPin = res.body.order.pickup.pickupPin;
      testDeliveryPin = res.body.order.stops[0].deliveryPin;
    });

    it('redacts pickupPin and deliveryPins from public GET /api/v1/orders/track/:trackingCode', async () => {
      const res = await request(app).get(`/api/v1/orders/track/${testTrackingCode}`);

      expect(res.status).toBe(200);
      const publicData = res.body;

      expect(publicData.trackingCode).toBe(testTrackingCode);
      expect(publicData.status).toBe('pending');
      expect(publicData.vehicleType).toBe('bike');

      // CRITICAL SECURITY ASSERTION: PINs must NOT exist in public tracking response
      expect((publicData.pickup as any).pickupPin).toBeUndefined();
      expect((publicData.pickup as any).contactPhone).toBeUndefined();

      expect(publicData.stops.length).toBe(1);
      expect((publicData.stops[0] as any).deliveryPin).toBeUndefined();
      expect((publicData.stops[0] as any).recipientPhone).toBeUndefined();

      // Non-sensitive data remains accessible
      expect(publicData.pickup.address).toBe('Maryland Mall, Maryland, Lagos');
      expect(publicData.pickup.landmark).toBe('Near front escalators');
      expect(publicData.stops[0].recipientName).toBe('Sola Shittu');
    });

    it('includes full PINs in authenticated sender GET /api/v1/orders/my-orders', async () => {
      const res = await request(app)
        .get('/api/v1/orders/my-orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.orders)).toBe(true);

      const myOrder = res.body.orders.find((o: any) => o.trackingCode === testTrackingCode);
      expect(myOrder).toBeDefined();

      // SENDER PRIVILEGE: Sender must receive both PINs to communicate with rider and recipient
      expect(myOrder.pickup.pickupPin).toBe(testPickupPin);
      expect(myOrder.stops[0].deliveryPin).toBe(testDeliveryPin);
    });

    it('returns 404 for non-existent tracking code', async () => {
      const res = await request(app).get('/api/v1/orders/track/LGS-999999');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('ORDER_NOT_FOUND');
    });

    it('returns 400 for malformed tracking code', async () => {
      const res = await request(app).get('/api/v1/orders/track/INVALID_CODE_123');
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_TRACKING_CODE');
    });

    it('Stage 14: hydrates assignedRider, liveTelemetry from Redis, and encodedRoutePolyline while preserving anti-fraud PIN privacy', async () => {
      const redis = getRedisClient();

      // 1. Create Rider Profile for riderUser
      const riderUser = await User.findOne({ phone: '+2348190001003' });
      expect(riderUser).toBeDefined();
      const riderId = riderUser!._id.toString();

      await RiderProfile.deleteMany({ userId: riderUser!._id });
      await RiderProfile.deleteMany({ plateNumber: 'KJA-777XY' });

      await RiderProfile.create({
        userId: riderUser!._id,
        vehicleType: 'bike',
        plateNumber: 'KJA-777XY',
        ridersCardNumber: 'RC-99887766',
        ridersCardDocumentUrl: 'https://storage.lagosexpress.ng/docs/rc-99887766.jpg',
        status: 'busy',
        rating: 4.85,
        lastLocation: {
          type: 'Point',
          coordinates: [3.37, 6.575], // GeoJSON [lng, lat]
        },
      });

      // 2. Populate Redis RAM Telemetry (Golden Rule 5)
      await redis.hset(`rider:telemetry:${riderId}`, {
        lat: '6.5750',
        lng: '3.3700',
        bearing: '120',
        speed: '38',
        accuracy: '4.5',
        updatedAt: String(Date.now()),
      });

      // 3. Assign rider to order and advance status to in_transit
      await Order.findOneAndUpdate(
        { trackingCode: testTrackingCode },
        {
          riderId: riderUser!._id,
          status: 'in_transit',
        }
      );

      // 4. Fetch public tracking details
      const res = await request(app).get(`/api/v1/orders/track/${testTrackingCode}`);
      expect(res.status).toBe(200);

      const data = res.body;
      expect(data.trackingCode).toBe(testTrackingCode);
      expect(data.status).toBe('in_transit');

      // Stage 14 Assigned Rider Hydration
      expect(data.assignedRider).toBeDefined();
      expect(data.assignedRider.fullName).toBe('Suleiman Danjuma');
      expect(data.assignedRider.phone).toBe('+2348190001003');
      expect(data.assignedRider.vehicleType).toBe('bike');
      expect(data.assignedRider.plateNumber).toBe('KJA-777XY');
      expect(data.assignedRider.rating).toBeCloseTo(4.85, 1);

      // Stage 14 Live Telemetry Hydration from Redis RAM
      expect(data.liveTelemetry).toBeDefined();
      expect(data.liveTelemetry.lat).toBe(6.575);
      expect(data.liveTelemetry.lng).toBe(3.37);
      expect(data.liveTelemetry.bearing).toBe(120);
      expect(data.liveTelemetry.speed).toBe(38);

      // Encoded polyline presence
      expect(data.encodedRoutePolyline).toBeDefined();
      expect(typeof data.encodedRoutePolyline).toBe('string');
      expect(data.encodedRoutePolyline.length).toBeGreaterThan(0);

      // Anti-Fraud PIN Privacy Guard (Golden Rule)
      expect((data.pickup as any).pickupPin).toBeUndefined();
      expect((data.stops[0] as any).deliveryPin).toBeUndefined();
    });
  });

  // SUITE 3: Payment Method & Initial Status Transitions
  describe('Suite 3: Payment Method & Initial Status Transitions', () => {
    it('sets status to searching_rider for pay_on_pickup', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          vehicleType: 'bike',
          paymentMethod: 'pay_on_pickup',
          pickup: {
            address: 'Allen Avenue, Ikeja',
            landmark: 'Beside Oshopey Plaza',
            location: { lat: 6.6018, lng: 3.3515 },
            contactName: 'Tunde',
            contactPhone: '+2348190001001',
          },
          stops: [
            {
              recipientName: 'Kemi',
              recipientPhone: '+2348021112233',
              dropoffAddress: 'Oshodi Transport Interchange',
              dropoffLandmark: 'Terminal 1 Entrance',
              dropoffLocation: { lat: 6.5569, lng: 3.3524 },
              packageDescription: 'Bag',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.order.status).toBe('searching_rider');
      expect(res.body.order.paymentStatus).toBe('unpaid');
    });

    it('sets status to pending for wallet and card_bank (awaiting Stage 7 escrow/webhook)', async () => {
      const resWallet = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          vehicleType: 'bike',
          paymentMethod: 'wallet',
          pickup: {
            address: 'Allen Avenue, Ikeja',
            landmark: 'Beside Oshopey Plaza',
            location: { lat: 6.6018, lng: 3.3515 },
            contactName: 'Tunde',
            contactPhone: '+2348190001001',
          },
          stops: [
            {
              recipientName: 'Kemi',
              recipientPhone: '+2348021112233',
              dropoffAddress: 'Oshodi Transport Interchange',
              dropoffLandmark: 'Terminal 1 Entrance',
              dropoffLocation: { lat: 6.5569, lng: 3.3524 },
              packageDescription: 'Bag',
            },
          ],
        });

      expect(resWallet.status).toBe(201);
      expect(resWallet.body.order.status).toBe('pending');

      const resCard = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          vehicleType: 'bike',
          paymentMethod: 'card_bank',
          pickup: {
            address: 'Allen Avenue, Ikeja',
            landmark: 'Beside Oshopey Plaza',
            location: { lat: 6.6018, lng: 3.3515 },
            contactName: 'Tunde',
            contactPhone: '+2348190001001',
          },
          stops: [
            {
              recipientName: 'Kemi',
              recipientPhone: '+2348021112233',
              dropoffAddress: 'Oshodi Transport Interchange',
              dropoffLandmark: 'Terminal 1 Entrance',
              dropoffLocation: { lat: 6.5569, lng: 3.3524 },
              packageDescription: 'Bag',
            },
          ],
        });

      expect(resCard.status).toBe(201);
      expect(resCard.body.order.status).toBe('pending');
    });
  });

  // SUITE 4: Role-Based Access Control & Validation
  describe('Suite 4: Role-Based Access Control & Validation', () => {
    it('forbids riders from creating orders with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          vehicleType: 'bike',
          paymentMethod: 'wallet',
          pickup: {
            address: 'Ikeja City Mall',
            landmark: 'Main Gate',
            location: { lat: 6.6198, lng: 3.3587 },
            contactName: 'Rider Trying To Order',
            contactPhone: '+2348190001003',
          },
          stops: [
            {
              recipientName: 'Receiver',
              recipientPhone: '+2348021112233',
              dropoffAddress: 'Ojota Bus Terminal',
              dropoffLandmark: 'Ikorodu Road side',
              dropoffLocation: { lat: 6.5828, lng: 3.3857 },
              packageDescription: 'Items',
            },
          ],
        });

      expect(res.status).toBe(403);
    });

    it('rejects order with 0 stops with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          vehicleType: 'bike',
          paymentMethod: 'wallet',
          pickup: {
            address: 'Ikeja City Mall',
            landmark: 'Main Gate',
            location: { lat: 6.6198, lng: 3.3587 },
            contactName: 'Tunde',
            contactPhone: '+2348190001001',
          },
          stops: [], // 0 stops
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .send({
          vehicleType: 'bike',
          paymentMethod: 'wallet',
        });

      expect(res.status).toBe(401);
    });
  });
});
