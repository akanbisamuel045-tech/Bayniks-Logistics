import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import request from 'supertest';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../app';
import { connectMongo, disconnectMongo } from '../config/db';
import { getRedisClient, closeRedis } from '../config/redis';
import {
  initSocketGateway,
  closeSocketGateway,
} from '../socket/socket.gateway';
import { dispatchService } from '../services/dispatch.service';
import { User, Order, RiderProfile } from '../models';
import { authService } from '../services/auth.service';
import {
  SOCKET_EVENTS,
  JobNewOffer,
  toGeoJsonPoint,
} from '@logistics/shared-types';

describe('Stage 10: Automated Nearest-Rider Geospatial Dispatch Worker', () => {
  let app: ReturnType<typeof createApp>;
  let httpServer: http.Server;
  let serverPort: number;

  let customerUserId: string;
  let customerToken: string;

  let rider1Id: string;
  let rider1Token: string;
  let rider2Id: string;
  let rider2Token: string;
  let rider3Id: string;
  let rider3Token: string;

  let activeClients: ClientSocket[] = [];

  const trackingCodes = ['LGS-DSP001', 'LGS-DSP002', 'LGS-DSP003', 'LGS-DSP004'];

  function createClient(token: string): ClientSocket {
    const socket = ioClient(`http://localhost:${serverPort}`, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    activeClients.push(socket);
    return socket;
  }

  beforeAll(async () => {
    await connectMongo();
    await Order.deleteMany({ trackingCode: { $in: trackingCodes } });
    await User.deleteMany({ phone: { $regex: /^\+234815/ } });

    // 1. Create Verified Customer
    const customer = await User.create({
      fullName: 'Chief Emeka Sender',
      phone: '+2348150001000',
      role: 'customer',
      isVerified: true,
      passwordHash: 'hashedpass',
    });
    customerUserId = customer._id.toString();
    const custTokens = await authService.createTokens({
      id: customerUserId,
      role: 'customer',
      phone: customer.phone,
      isVerified: true,
    });
    customerToken = custTokens.accessToken;

    // 2. Create Rider 1 (Close: ~500m at Computer Village: 6.5933, 3.3421)
    const rider1 = await User.create({
      fullName: 'Rider One Quick',
      phone: '+2348150001001',
      role: 'rider',
      isVerified: true,
      passwordHash: 'hashedpass',
    });
    rider1Id = rider1._id.toString();
    const r1Tokens = await authService.createTokens({
      id: rider1Id,
      role: 'rider',
      phone: rider1.phone,
      isVerified: true,
    });
    rider1Token = r1Tokens.accessToken;

    await RiderProfile.create({
      userId: rider1._id,
      vehicleType: 'bike',
      plateNumber: 'KJA-501-AA',
      ridersCardNumber: 'CARD-501',
      ridersCardDocumentUrl: 'https://docs.test/card501.pdf',
      kycStatus: 'approved',
      status: 'available',
      lastLocation: toGeoJsonPoint({ lat: 6.5933, lng: 3.3421 }),
      lastSeenAt: new Date(),
    });

    // 3. Create Rider 2 (Medium: ~1.6km at Allen Ave: 6.6050, 3.3500)
    const rider2 = await User.create({
      fullName: 'Rider Two Medium',
      phone: '+2348150001002',
      role: 'rider',
      isVerified: true,
      passwordHash: 'hashedpass',
    });
    rider2Id = rider2._id.toString();
    const r2Tokens = await authService.createTokens({
      id: rider2Id,
      role: 'rider',
      phone: rider2.phone,
      isVerified: true,
    });
    rider2Token = r2Tokens.accessToken;

    await RiderProfile.create({
      userId: rider2._id,
      vehicleType: 'bike',
      plateNumber: 'LSD-502-BB',
      ridersCardNumber: 'CARD-502',
      ridersCardDocumentUrl: 'https://docs.test/card502.pdf',
      kycStatus: 'approved',
      status: 'available',
      lastLocation: toGeoJsonPoint({ lat: 6.6050, lng: 3.3500 }),
      lastSeenAt: new Date(),
    });

    // 4. Create Rider 3 (Far: ~4.8km at Maryland: 6.5714, 3.3687)
    const rider3 = await User.create({
      fullName: 'Rider Three Far',
      phone: '+2348150001003',
      role: 'rider',
      isVerified: true,
      passwordHash: 'hashedpass',
    });
    rider3Id = rider3._id.toString();
    const r3Tokens = await authService.createTokens({
      id: rider3Id,
      role: 'rider',
      phone: rider3.phone,
      isVerified: true,
    });
    rider3Token = r3Tokens.accessToken;

    await RiderProfile.create({
      userId: rider3._id,
      vehicleType: 'bike',
      plateNumber: 'IKJ-503-CC',
      ridersCardNumber: 'CARD-503',
      ridersCardDocumentUrl: 'https://docs.test/card503.pdf',
      kycStatus: 'approved',
      status: 'available',
      lastLocation: toGeoJsonPoint({ lat: 6.5714, lng: 3.3687 }),
      lastSeenAt: new Date(),
    });

    // 5. Setup Redis GEO Set (riders:available:locations)
    // Golden Rule 4: strictly <lng> <lat>
    const redis = getRedisClient();
    await redis.del('riders:available:locations');
    await redis.geoadd('riders:available:locations', 3.3421, 6.5933, rider1Id);
    await redis.geoadd('riders:available:locations', 3.3500, 6.6050, rider2Id);
    await redis.geoadd('riders:available:locations', 3.3687, 6.5714, rider3Id);

    // 6. Start HTTP Server with Socket.io Gateway
    app = createApp();
    httpServer = http.createServer(app);
    initSocketGateway(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address() as AddressInfo;
        serverPort = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    dispatchService.clearAllTimers();

    for (const client of activeClients) {
      if (client.connected) {
        client.disconnect();
      }
    }
    activeClients = [];

    await closeSocketGateway();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));

    const redis = getRedisClient();
    await redis.zrem('riders:available:locations', rider1Id, rider2Id, rider3Id);

    for (const code of trackingCodes) {
      const order = await Order.findOne({ trackingCode: code });
      if (order) {
        await redis.del(`dispatch:offers:${order._id}`);
        await redis.del(`dispatch:declined:${order._id}`);
        await redis.del(`lock:order:${order._id}`);
      }
    }

    await RiderProfile.deleteMany({ userId: { $in: [rider1Id, rider2Id, rider3Id] } });
    await Order.deleteMany({ trackingCode: { $in: trackingCodes } });
    await User.deleteMany({ phone: { $regex: /^\+234815/ } });
    await disconnectMongo();
    await closeRedis();
  });

  afterEach(() => {
    dispatchService.clearAllTimers();
    for (const client of activeClients) {
      if (client.connected) {
        client.disconnect();
      }
    }
    activeClients = [];
  });

  // SUITE 1: 3km to 6km Expanding Radius Discovery & Offer Broadcast
  describe('Suite 1: 3km to 6km Expanding Radius Discovery & Offer Broadcast', () => {
    it('discovers closest 2 riders inside 3km radius and emits job:new_offer over WebSocket', async () => {
      // Reset Redis GEO Set to guarantee test isolation against parallel test suites
      const redis = getRedisClient();
      await redis.del('riders:available:locations');
      await redis.geoadd('riders:available:locations', 3.3421, 6.5933, rider1Id);
      await redis.geoadd('riders:available:locations', 3.3500, 6.6050, rider2Id);
      await redis.geoadd('riders:available:locations', 3.3687, 6.5714, rider3Id);

      // Connect Rider 1 and Rider 2 over WebSocket
      const socketRider1 = createClient(rider1Token);
      const socketRider2 = createClient(rider2Token);

      await Promise.all([
        new Promise<void>((resolve) => socketRider1.on('connect', () => resolve())),
        new Promise<void>((resolve) => socketRider2.on('connect', () => resolve())),
      ]);

      const r1OfferPromise = new Promise<JobNewOffer>((resolve) => {
        socketRider1.on(SOCKET_EVENTS.JOB_NEW_OFFER, (data: JobNewOffer) => resolve(data));
      });
      const r2OfferPromise = new Promise<JobNewOffer>((resolve) => {
        socketRider2.on(SOCKET_EVENTS.JOB_NEW_OFFER, (data: JobNewOffer) => resolve(data));
      });

      // Create Order at Ikeja Under Bridge: 6.5956, 3.3380
      const order = await Order.create({
        trackingCode: 'LGS-DSP001',
        senderId: customerUserId,
        vehicleType: 'bike',
        paymentMethod: 'pay_on_pickup',
        paymentStatus: 'unpaid',
        status: 'searching_rider',
        estimatedDistanceKm: 6.5,
        totalFareKobo: 250000,
        platformCommissionKobo: 50000,
        riderEarningKobo: 200000,
        pickup: {
          address: 'Ikeja Under Bridge, Awolowo Way',
          landmark: 'Beside BRT Terminal',
          location: { type: 'Point', coordinates: [3.3380, 6.5956] },
          contactName: 'Chief Emeka',
          contactPhone: '+2348150001000',
          pickupPin: '3344',
        },
        stops: [
          {
            sequenceNumber: 1,
            recipientName: 'Oluwaseun Drop',
            recipientPhone: '+2348031112233',
            dropoffAddress: 'Allen Junction, Ikeja',
            dropoffLandmark: 'Opposite Dominoes',
            dropoffLocation: { type: 'Point', coordinates: [3.3510, 6.6030] },
            packageDescription: 'Documents',
            deliveryPin: '7788',
            status: 'pending',
          },
        ],
      });

      // Trigger Dispatch
      const dispatchResult = await dispatchService.dispatchOrderToNearestRiders(order._id.toString());

      expect(dispatchResult.matched).toBe(true);
      expect(dispatchResult.radiusMetersUsed).toBe(3000); // Matched within 3km
      expect(dispatchResult.offeredRiderIds).toContain(rider1Id);
      expect(dispatchResult.offeredRiderIds).toContain(rider2Id);
      expect(dispatchResult.offeredRiderIds).not.toContain(rider3Id); // Rider 3 is at 4.8km, not needed

      // Verify WebSocket broadcasts received
      const [offer1, offer2] = await Promise.all([r1OfferPromise, r2OfferPromise]);
      expect(offer1.trackingCode).toBe('LGS-DSP001');
      expect(offer1.orderId).toBe(order._id.toString());
      expect(offer1.riderEarningKobo).toBe(200000);
      expect(offer2.trackingCode).toBe('LGS-DSP001');
    });

    it('automatically expands radius to 6km and offers to Rider 3 when 3km radius has no available riders', async () => {
      // Connect Rider 3
      const socketRider3 = createClient(rider3Token);
      await new Promise<void>((resolve) => socketRider3.on('connect', () => resolve()));

      const r3OfferPromise = new Promise<JobNewOffer>((resolve) => {
        socketRider3.on(SOCKET_EVENTS.JOB_NEW_OFFER, (data: JobNewOffer) => resolve(data));
      });

      // Create Order 2 at Palm Grove / Onipanu (lat: 6.5350, lng: 3.3687)
      // Rider 1 & Rider 2 at Ikeja are > 7km away. Rider 3 at Maryland is 4.04km away (between 3km and 6km).
      const order2 = await Order.create({
        trackingCode: 'LGS-DSP002',
        senderId: customerUserId,
        vehicleType: 'bike',
        paymentMethod: 'pay_on_pickup',
        paymentStatus: 'unpaid',
        status: 'searching_rider',
        estimatedDistanceKm: 8.0,
        totalFareKobo: 300000,
        platformCommissionKobo: 60000,
        riderEarningKobo: 240000,
        pickup: {
          address: 'Palm Grove Bus Stop, Ikorodu Road',
          landmark: 'Beside Mobil Fuel Station',
          location: { type: 'Point', coordinates: [3.3687, 6.5350] },
          contactName: 'Chief Emeka',
          contactPhone: '+2348150001000',
          pickupPin: '5566',
        },
        stops: [
          {
            sequenceNumber: 1,
            recipientName: 'Kemi Drop',
            recipientPhone: '+2348039998877',
            dropoffAddress: 'Maryland Mall',
            dropoffLandmark: 'Anthony side',
            dropoffLocation: { type: 'Point', coordinates: [3.3687, 6.5714] },
            packageDescription: 'Wristwatch parcel',
            deliveryPin: '9900',
            status: 'pending',
          },
        ],
      });

      // Trigger Dispatch
      const dispatchResult = await dispatchService.dispatchOrderToNearestRiders(order2._id.toString());

      expect(dispatchResult.matched).toBe(true);
      expect(dispatchResult.radiusMetersUsed).toBe(6000); // 3km had 0 riders, automatically expanded to 6km
      expect(dispatchResult.offeredRiderIds).toEqual([rider3Id]); // Rider 3 at 4.04km is reached

      const offer3 = await r3OfferPromise;
      expect(offer3.trackingCode).toBe('LGS-DSP002');
      expect(offer3.riderEarningKobo).toBe(240000);
    });
  });

  // SUITE 2: Simultaneous 3-Rider "Accept" Race Condition (Redis SET NX Proof)
  describe('Suite 2: Simultaneous 3-Rider "Accept" Race Condition (Atomic Lock Proof)', () => {
    it('allows strictly 1 rider to accept the order while the other 2 receive 409 Conflict', async () => {
      // Ensure all 3 riders are 'available' in MongoDB & Redis
      await RiderProfile.updateMany(
        { userId: { $in: [rider1Id, rider2Id, rider3Id] } },
        { $set: { status: 'available' } }
      );
      const redis = getRedisClient();
      await redis.geoadd('riders:available:locations', 3.3421, 6.5933, rider1Id);
      await redis.geoadd('riders:available:locations', 3.3500, 6.6050, rider2Id);
      await redis.geoadd('riders:available:locations', 3.3687, 6.5714, rider3Id);

      // Create Order 3 in searching_rider
      const order3 = await Order.create({
        trackingCode: 'LGS-DSP003',
        senderId: customerUserId,
        vehicleType: 'bike',
        paymentMethod: 'wallet',
        paymentStatus: 'paid',
        status: 'searching_rider',
        estimatedDistanceKm: 5.0,
        totalFareKobo: 200000,
        platformCommissionKobo: 40000,
        riderEarningKobo: 160000,
        pickup: {
          address: 'Computer Village, Ikeja',
          landmark: 'Otigba Street',
          location: { type: 'Point', coordinates: [3.3421, 6.5933] },
          contactName: 'Chief Emeka',
          contactPhone: '+2348150001000',
          pickupPin: '1122',
        },
        stops: [
          {
            sequenceNumber: 1,
            recipientName: 'Chima',
            recipientPhone: '+2348021113344',
            dropoffAddress: 'Yaba',
            dropoffLandmark: 'Commercial Avenue',
            dropoffLocation: { type: 'Point', coordinates: [3.3750, 6.5150] },
            packageDescription: 'Spare parts',
            deliveryPin: '3344',
            status: 'pending',
          },
        ],
      });

      const orderId = order3._id.toString();

      // Fire simultaneous accept requests from all 3 riders
      const responses = await Promise.all([
        request(app)
          .post('/api/v1/dispatch/respond')
          .set('Authorization', `Bearer ${rider1Token}`)
          .send({ orderId, action: 'accept' }),
        request(app)
          .post('/api/v1/dispatch/respond')
          .set('Authorization', `Bearer ${rider2Token}`)
          .send({ orderId, action: 'accept' }),
        request(app)
          .post('/api/v1/dispatch/respond')
          .set('Authorization', `Bearer ${rider3Token}`)
          .send({ orderId, action: 'accept' }),
      ]);

      const successfulResponses = responses.filter((res) => res.status === 200);
      const conflictResponses = responses.filter((res) => res.status === 409);

      // EXACTLY ONE rider wins!
      expect(successfulResponses.length).toBe(1);
      expect(conflictResponses.length).toBe(2);

      const winnerRes = successfulResponses[0]!;
      expect(winnerRes.body.ok).toBe(true);
      expect(winnerRes.body.action).toBe('accept');
      expect(winnerRes.body.order.status).toBe('rider_assigned');

      // The 2 losers receive 409 Conflict with clear error codes
      for (const failRes of conflictResponses) {
        expect(['ORDER_LOCKED_BY_ANOTHER_RIDER', 'ORDER_ALREADY_ASSIGNED']).toContain(failRes.body.code);
      }

      // Verify MongoDB Order state
      const finalOrder = await Order.findById(orderId);
      expect(finalOrder?.status).toBe('rider_assigned');
      expect([rider1Id, rider2Id, rider3Id]).toContain(finalOrder?.riderId?.toString());

      const winningRiderId = finalOrder!.riderId!.toString();

      // Verify winner's RiderProfile is now 'busy'
      const winningProfile = await RiderProfile.findOne({ userId: winningRiderId });
      expect(winningProfile?.status).toBe('busy');

      // Verify winner is removed from Redis available pool
      const availableScores = await redis.geopos('riders:available:locations', winningRiderId);
      expect(availableScores[0]).toBeNull();

      // Verify the 2 losing riders remain 'available'
      const losingRiderIds = [rider1Id, rider2Id, rider3Id].filter((id) => id !== winningRiderId);
      const losingProfiles = await RiderProfile.find({ userId: { $in: losingRiderIds } });
      expect(losingProfiles.every((p) => p.status === 'available')).toBe(true);
    });
  });

  // SUITE 3: Decline & Next-Wave Re-Dispatch Exclusion
  describe('Suite 3: Decline & Next-Wave Re-Dispatch Exclusion', () => {
    it('excludes declining rider and re-dispatches order to the next available rider', async () => {
      // Create Order 4
      const order4 = await Order.create({
        trackingCode: 'LGS-DSP004',
        senderId: customerUserId,
        vehicleType: 'bike',
        paymentMethod: 'pay_on_pickup',
        paymentStatus: 'unpaid',
        status: 'searching_rider',
        estimatedDistanceKm: 6.0,
        totalFareKobo: 220000,
        platformCommissionKobo: 44000,
        riderEarningKobo: 176000,
        pickup: {
          address: 'Computer Village, Ikeja',
          landmark: 'Otigba Street',
          location: { type: 'Point', coordinates: [3.3421, 6.5933] },
          contactName: 'Chief Emeka',
          contactPhone: '+2348150001000',
          pickupPin: '7766',
        },
        stops: [
          {
            sequenceNumber: 1,
            recipientName: 'Bisi',
            recipientPhone: '+2348025556677',
            dropoffAddress: 'Gbagada Phase 2',
            dropoffLandmark: 'Gbagada Expressway side',
            dropoffLocation: { type: 'Point', coordinates: [3.3850, 6.5550] },
            packageDescription: 'Electronics',
            deliveryPin: '9988',
            status: 'pending',
          },
        ],
      });

      const orderId = order4._id.toString();
      const redis = getRedisClient();

      // Ensure Rider 1 and Rider 2 are available
      await RiderProfile.updateOne({ userId: rider1Id }, { $set: { status: 'available' } });
      await RiderProfile.updateOne({ userId: rider2Id }, { $set: { status: 'available' } });
      await redis.geoadd('riders:available:locations', 3.3421, 6.5933, rider1Id);
      await redis.geoadd('riders:available:locations', 3.3500, 6.6050, rider2Id);

      // 1. Initial Dispatch offers to Rider 1 and Rider 2
      await dispatchService.dispatchOrderToNearestRiders(orderId);

      // 2. Rider 1 declines
      const declineRes = await request(app)
        .post('/api/v1/dispatch/respond')
        .set('Authorization', `Bearer ${rider1Token}`)
        .send({ orderId, action: 'decline' });

      expect(declineRes.status).toBe(200);
      expect(declineRes.body.ok).toBe(true);
      expect(declineRes.body.action).toBe('decline');

      // Verify Rider 1 is tracked in dispatch:declined:<orderId>
      const isDeclined = await redis.sismember(`dispatch:declined:${orderId}`, rider1Id);
      expect(isDeclined).toBe(1);

      // 3. When searching riders again for this order, Rider 1 is strictly excluded
      const nextRiders = await dispatchService.findNearestAvailableRiders(
        { lat: 6.5933, lng: 3.3421 },
        'bike',
        3000,
        [rider1Id]
      );
      expect(nextRiders).not.toContain(rider1Id);
      expect(nextRiders).toContain(rider2Id);
    });
  });

  // SUITE 4: Anti-Fraud PIN Redaction on Rider Payload
  describe('Suite 4: Anti-Fraud PIN Redaction on Rider Payload', () => {
    it('strictly omits pickupPin and deliveryPin from the order object returned to the rider upon acceptance', async () => {
      // Order 1 was created with pickupPin: '3344' and deliveryPin: '7788'
      const order = await Order.findOne({ trackingCode: 'LGS-DSP001' });
      expect(order).not.toBeNull();

      // Reset order state for acceptance test
      await Order.updateOne(
        { _id: order!._id },
        { $set: { status: 'searching_rider', riderId: null } }
      );
      await RiderProfile.updateOne(
        { userId: rider1Id },
        { $set: { status: 'available' } }
      );

      // Rider 1 accepts the offer
      const res = await request(app)
        .post('/api/v1/dispatch/respond')
        .set('Authorization', `Bearer ${rider1Token}`)
        .send({ orderId: order!._id.toString(), action: 'accept' });

      expect(res.status).toBe(200);
      const returnedOrder = res.body.order;

      // Address and navigation landmarks must be provided
      expect(returnedOrder.pickup.address).toBe('Ikeja Under Bridge, Awolowo Way');
      expect(returnedOrder.pickup.landmark).toBe('Beside BRT Terminal');
      expect(returnedOrder.stops[0].dropoffAddress).toBe('Allen Junction, Ikeja');
      expect(returnedOrder.stops[0].dropoffLandmark).toBe('Opposite Dominoes');

      // CRITICAL FRAUD CHECK: pickupPin and deliveryPin must be strictly undefined / redacted!
      expect(returnedOrder.pickup.pickupPin).toBeUndefined();
      expect(returnedOrder.stops[0].deliveryPin).toBeUndefined();
    });
  });

  // SUITE 5: Stage 11 Rider Active Order & Sequential State Machine Transitions
  describe('Suite 5: Stage 11 Rider Active Order & Sequential State Machine Transitions', () => {
    it('returns null when rider has no active order, and returns active order when assigned', async () => {
      // Rider 3 has no order assigned
      const idleRes = await request(app)
        .get('/api/v1/dispatch/active-order')
        .set('Authorization', `Bearer ${rider3Token}`);

      expect(idleRes.status).toBe(200);
      expect(idleRes.body.ok).toBe(true);
      expect(idleRes.body.order).toBeNull();

      // Rider 1 has Order 1 assigned
      const activeRes = await request(app)
        .get('/api/v1/dispatch/active-order')
        .set('Authorization', `Bearer ${rider1Token}`);

      expect(activeRes.status).toBe(200);
      expect(activeRes.body.ok).toBe(true);
      expect(activeRes.body.order).not.toBeNull();
      expect(activeRes.body.order.trackingCode).toBe('LGS-DSP001');
      // Verify PINs are sanitized
      expect(activeRes.body.order.pickup.pickupPin).toBeUndefined();
      expect(activeRes.body.order.stops[0].deliveryPin).toBeUndefined();
    });

    it('advances order through valid sequential lifecycle states: rider_assigned -> arrived_pickup -> in_transit -> arrived_dropoff', async () => {
      const order = await Order.findOne({ trackingCode: 'LGS-DSP001' });
      expect(order).not.toBeNull();
      const orderId = order!._id.toString();

      // Ensure order starts in rider_assigned
      await Order.updateOne({ _id: orderId }, { $set: { status: 'rider_assigned' } });

      // Step 1: Transition to arrived_pickup
      const step1 = await request(app)
        .patch(`/api/v1/dispatch/orders/${orderId}/state`)
        .set('Authorization', `Bearer ${rider1Token}`)
        .send({ status: 'arrived_pickup' });

      expect(step1.status).toBe(200);
      expect(step1.body.ok).toBe(true);
      expect(step1.body.order.status).toBe('arrived_pickup');

      // Step 2: Transition to in_transit
      const step2 = await request(app)
        .patch(`/api/v1/dispatch/orders/${orderId}/state`)
        .set('Authorization', `Bearer ${rider1Token}`)
        .send({ status: 'in_transit', stopSequenceNumber: 1 });

      expect(step2.status).toBe(200);
      expect(step2.body.ok).toBe(true);
      expect(step2.body.order.status).toBe('in_transit');

      // Step 3: Transition to arrived_dropoff
      const step3 = await request(app)
        .patch(`/api/v1/dispatch/orders/${orderId}/state`)
        .set('Authorization', `Bearer ${rider1Token}`)
        .send({ status: 'arrived_dropoff', stopSequenceNumber: 1 });

      expect(step3.status).toBe(200);
      expect(step3.body.ok).toBe(true);
      expect(step3.body.order.status).toBe('arrived_dropoff');
    });

    it('rejects invalid state jumps with 400 INVALID_STATE_TRANSITION', async () => {
      const order = await Order.findOne({ trackingCode: 'LGS-DSP001' });
      const orderId = order!._id.toString();

      // Reset to rider_assigned
      await Order.updateOne({ _id: orderId }, { $set: { status: 'rider_assigned' } });

      // Attempt to jump straight to arrived_dropoff (skipping arrived_pickup and in_transit)
      const invalidRes = await request(app)
        .patch(`/api/v1/dispatch/orders/${orderId}/state`)
        .set('Authorization', `Bearer ${rider1Token}`)
        .send({ status: 'arrived_dropoff' });

      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.code).toBe('INVALID_STATE_TRANSITION');
      expect(invalidRes.body.error).toContain('Cannot transition order');
    });

    it('prevents unauthorized riders from modifying another riders order', async () => {
      const order = await Order.findOne({ trackingCode: 'LGS-DSP001' });
      const orderId = order!._id.toString();

      // Rider 2 attempts to transition Rider 1's order
      const res = await request(app)
        .patch(`/api/v1/dispatch/orders/${orderId}/state`)
        .set('Authorization', `Bearer ${rider2Token}`)
        .send({ status: 'arrived_pickup' });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('ORDER_NOT_FOUND');
    });
  });
});
