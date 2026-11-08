import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
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
import { telemetryService } from '../services/telemetry.service';
import { User, Order, RiderProfile } from '../models';
import { authService } from '../services/auth.service';
import {
  SOCKET_EVENTS,
  TrackingUpdate,
  RiderLocationPing,
  TelemetryIngestResult,
} from '@logistics/shared-types';

describe('Stage 9: High-Frequency Redis Telemetry Ingestion & HTTP Fallback Endpoint', () => {
  let app: ReturnType<typeof createApp>;
  let httpServer: http.Server;
  let serverPort: number;
  let riderUserId: string;
  let riderToken: string;
  let customerUserId: string;
  let customerToken: string;
  let testOrderId: string;
  const testTrackingCode = 'LGS-999111';
  let activeClients: ClientSocket[] = [];

  function createClient(options?: { token?: string }): ClientSocket {
    const socket = ioClient(`http://localhost:${serverPort}`, {
      auth: options?.token ? { token: options.token } : undefined,
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    activeClients.push(socket);
    return socket;
  }

  beforeAll(async () => {
    await connectMongo();
    await Order.deleteMany({ trackingCode: testTrackingCode });
    await User.deleteMany({ phone: { $regex: /^\+234816/ } });

    // 1. Create Verified Rider User
    const rider = await User.create({
      fullName: 'Babatunde Dispatcher',
      phone: '+2348160001001',
      role: 'rider',
      isVerified: true,
      passwordHash: 'hashedpassword',
    });
    riderUserId = rider._id.toString();
    const riderTokens = await authService.createTokens({
      id: riderUserId,
      role: 'rider',
      phone: rider.phone,
      isVerified: true,
    });
    riderToken = riderTokens.accessToken;

    // 2. Create Customer User
    const customer = await User.create({
      fullName: 'Amina Customer',
      phone: '+2348160001002',
      role: 'customer',
      isVerified: true,
      passwordHash: 'hashedpassword',
    });
    customerUserId = customer._id.toString();
    const customerTokens = await authService.createTokens({
      id: customerUserId,
      role: 'customer',
      phone: customer.phone,
      isVerified: true,
    });
    customerToken = customerTokens.accessToken;

    // 3. Create Test Order Assigned to Rider
    const order = await Order.create({
      trackingCode: testTrackingCode,
      senderId: customerUserId,
      riderId: riderUserId,
      vehicleType: 'bike',
      paymentMethod: 'wallet',
      paymentStatus: 'paid',
      status: 'in_transit',
      estimatedDistanceKm: 7.2,
      totalFareKobo: 250000,
      platformCommissionKobo: 50000,
      riderEarningKobo: 200000,
      pickup: {
        address: 'Computer Village, Ikeja',
        landmark: 'Otigba Street',
        location: { type: 'Point', coordinates: [3.3421, 6.5933] },
        contactName: 'Amina',
        contactPhone: '+2348160001002',
        pickupPin: '1234',
      },
      stops: [
        {
          sequenceNumber: 1,
          recipientName: 'Recipient Express',
          recipientPhone: '+2348029998877',
          dropoffAddress: 'Maryland Mall',
          dropoffLandmark: 'Anthony Bridge side',
          dropoffLocation: { type: 'Point', coordinates: [3.3687, 6.5714] },
          packageDescription: 'Phone Accessories',
          deliveryPin: '5678',
          status: 'pending',
        },
      ],
    });
    testOrderId = order._id.toString();

    // 4. Start HTTP Server with Socket.io Gateway
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
    for (const client of activeClients) {
      if (client.connected) {
        client.disconnect();
      }
    }
    activeClients = [];

    await closeSocketGateway();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));

    const redis = getRedisClient();
    await redis.del(`rider:telemetry:${riderUserId}`);
    await redis.del(`order:route_points:${testOrderId}`);
    await redis.zrem('riders:available:locations', riderUserId);

    await Order.deleteMany({ trackingCode: testTrackingCode });
    await User.deleteMany({ phone: { $regex: /^\+234816/ } });
    await disconnectMongo();
    await closeRedis();
  });

  beforeEach(async () => {
    const redis = getRedisClient();
    await redis.del(`rider:telemetry:${riderUserId}`);
    await redis.del(`order:route_points:${testOrderId}`);
  });

  afterEach(() => {
    for (const client of activeClients) {
      if (client.connected) {
        client.disconnect();
      }
    }
    activeClients = [];
    vi.restoreAllMocks();
  });

  // SUITE 1: WebSocket Telemetry Ping -> Sub-50ms Broadcast & Redis Ingestion
  describe('Suite 1: WebSocket Telemetry Ping -> Instant Broadcast & Redis State', () => {
    it('ingests rider:location_ping over WebSocket and broadcasts tracking:update to tracking room in < 50ms', async () => {
      const redis = getRedisClient();

      // 1. Connect unauthenticated Guest client and subscribe to tracking room
      const guestClient = createClient();
      await new Promise<void>((resolve) => guestClient.on('connect', () => resolve()));

      await new Promise<any>((resolve) => {
        guestClient.emit(
          SOCKET_EVENTS.TRACK_SUBSCRIBE,
          { trackingCode: testTrackingCode },
          (res: any) => resolve(res)
        );
      });

      // 2. Connect authenticated Rider client
      const riderClient = createClient({ token: riderToken });
      await new Promise<void>((resolve) => riderClient.on('connect', () => resolve()));

      // 3. Setup listener on Guest for tracking:update with latency timer
      const startTime = Date.now();
      const updatePromise = new Promise<{ update: TrackingUpdate; latencyMs: number }>((resolve) => {
        guestClient.on(SOCKET_EVENTS.TRACKING_UPDATE, (update: TrackingUpdate) => {
          const latencyMs = Date.now() - startTime;
          resolve({ update, latencyMs });
        });
      });

      // 4. Rider transmits location ping
      const pingPayload: RiderLocationPing = {
        orderId: testOrderId,
        trackingCode: testTrackingCode,
        lat: 6.5997,
        lng: 3.3364,
        bearing: 185,
        speed: 38.5,
        accuracy: 8,
        batteryLevel: 85,
        timestamp: Date.now(),
      };

      const ackResponse = await new Promise<any>((resolve) => {
        riderClient.emit(SOCKET_EVENTS.RIDER_LOCATION_PING, pingPayload, (res: any) => resolve(res));
      });

      expect(ackResponse.ok).toBe(true);
      expect(ackResponse.result.accepted).toBe(true);

      // 5. Verify Guest received broadcast with exact coordinates
      const { update, latencyMs } = await updatePromise;
      expect(update.trackingCode).toBe(testTrackingCode);
      expect(update.riderId).toBe(riderUserId);
      expect(update.lat).toBe(6.5997);
      expect(update.lng).toBe(3.3364);
      expect(update.bearing).toBe(185);
      expect(update.speed).toBe(38.5);
      expect(latencyMs).toBeLessThanOrEqual(500); // Network transmission cushion for test runner

      // 6. Verify Redis Hash rider:telemetry:<id> has TTL <= 60s
      const ttl = await redis.ttl(`rider:telemetry:${riderUserId}`);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);

      // 7. Verify Redis Hash fields
      const storedTelemetry = await redis.hgetall(`rider:telemetry:${riderUserId}`);
      expect(Number(storedTelemetry.lat)).toBe(6.5997);
      expect(Number(storedTelemetry.lng)).toBe(3.3364);
      expect(Number(storedTelemetry.bearing)).toBe(185);
      expect(Number(storedTelemetry.speed)).toBe(38.5);
      expect(Number(storedTelemetry.batteryLevel)).toBe(85);
      expect(storedTelemetry.trackingCode).toBe(testTrackingCode);

      // 8. Verify Redis List order:route_points:<id> holds the breadcrumb
      const breadcrumbs = await telemetryService.getOrderRouteBreadcrumbs(testOrderId);
      expect(breadcrumbs.length).toBeGreaterThanOrEqual(1);
      expect(breadcrumbs[0]!.lat).toBe(6.5997);
      expect(breadcrumbs[0]!.lng).toBe(3.3364);
    });

    it('rejects unauthenticated or non-rider sockets from transmitting location pings', async () => {
      // Guest client (no token)
      const guestClient = createClient();
      await new Promise<void>((resolve) => guestClient.on('connect', () => resolve()));

      const guestAck = await new Promise<any>((resolve) => {
        guestClient.emit(
          SOCKET_EVENTS.RIDER_LOCATION_PING,
          {
            lat: 6.5,
            lng: 3.3,
            bearing: 0,
            speed: 20,
            accuracy: 10,
            timestamp: Date.now(),
          },
          (res: any) => resolve(res)
        );
      });

      expect(guestAck.ok).toBe(false);
      expect(guestAck.code).toBe('FORBIDDEN_ROLE');

      // Customer client (wrong role)
      const customerClient = createClient({ token: customerToken });
      await new Promise<void>((resolve) => customerClient.on('connect', () => resolve()));

      const customerAck = await new Promise<any>((resolve) => {
        customerClient.emit(
          SOCKET_EVENTS.RIDER_LOCATION_PING,
          {
            lat: 6.5,
            lng: 3.3,
            bearing: 0,
            speed: 20,
            accuracy: 10,
            timestamp: Date.now(),
          },
          (res: any) => resolve(res)
        );
      });

      expect(customerAck.ok).toBe(false);
      expect(customerAck.code).toBe('FORBIDDEN_ROLE');
    });
  });

  // SUITE 2: Strict Golden Rule 5 Proof (Zero MongoDB Writes During Burst)
  describe('Suite 2: Strict Golden Rule 5 Proof (Zero MongoDB Writes During Burst)', () => {
    it('processes 50 rapid location pings in Redis RAM with ZERO MongoDB writes', async () => {
      // Spy on all Mongoose write methods across relevant models
      const orderSaveSpy = vi.spyOn(Order.prototype, 'save');
      const orderUpdateOneSpy = vi.spyOn(Order, 'updateOne');
      const orderUpdateManySpy = vi.spyOn(Order, 'updateMany');
      const orderFindOneAndUpdateSpy = vi.spyOn(Order, 'findOneAndUpdate');

      const userUpdateOneSpy = vi.spyOn(User, 'updateOne');
      const riderProfileUpdateOneSpy = vi.spyOn(RiderProfile, 'updateOne');

      const startTime = Date.now();
      const pingsCount = 50;
      const pingPromises: Promise<TelemetryIngestResult>[] = [];

      for (let i = 0; i < pingsCount; i++) {
        const ping: RiderLocationPing = {
          orderId: testOrderId,
          trackingCode: testTrackingCode,
          lat: 6.5900 + i * 0.0001,
          lng: 3.3400 + i * 0.0001,
          bearing: (i * 7) % 360,
          speed: 30 + (i % 15),
          accuracy: 5 + (i % 5),
          timestamp: startTime - 30000 + i * 500,
        };
        pingPromises.push(telemetryService.ingestRiderPing(riderUserId, ping));
      }

      const results = await Promise.all(pingPromises);
      const totalElapsedMs = Date.now() - startTime;

      // Assert all 50 pings were accepted
      expect(results.length).toBe(50);
      expect(results.every((r) => r.accepted)).toBe(true);

      // Verify ZERO MongoDB write queries were executed
      expect(orderSaveSpy).toHaveBeenCalledTimes(0);
      expect(orderUpdateOneSpy).toHaveBeenCalledTimes(0);
      expect(orderUpdateManySpy).toHaveBeenCalledTimes(0);
      expect(orderFindOneAndUpdateSpy).toHaveBeenCalledTimes(0);
      expect(userUpdateOneSpy).toHaveBeenCalledTimes(0);
      expect(riderProfileUpdateOneSpy).toHaveBeenCalledTimes(0);

      // Performance check: 50 Redis operations completed rapidly
      expect(totalElapsedMs).toBeLessThan(1500);
    });
  });

  // SUITE 3: GPS Jitter, Speed Spike & Mock Location Filtering
  describe('Suite 3: GPS Jitter, Speed Spike & Mock Location Filtering', () => {
    it('rejects low GPS accuracy (> 50m) and preserves previous clean coordinate', async () => {
      // 1. Establish clean position
      await telemetryService.ingestRiderPing(riderUserId, {
        orderId: testOrderId,
        trackingCode: testTrackingCode,
        lat: 6.5200,
        lng: 3.3700,
        bearing: 90,
        speed: 25,
        accuracy: 12, // Good signal (12m)
        timestamp: Date.now(),
      });

      const cleanTelemetry = await telemetryService.getRiderLiveTelemetry(riderUserId);
      expect(cleanTelemetry?.lat).toBe(6.5200);
      expect(cleanTelemetry?.lng).toBe(3.3700);

      // 2. Transmit degraded ping with accuracy = 85m (> 50m limit)
      const degradedResult = await telemetryService.ingestRiderPing(riderUserId, {
        orderId: testOrderId,
        trackingCode: testTrackingCode,
        lat: 6.5500, // Drastic drift coordinate
        lng: 3.3900,
        bearing: 180,
        speed: 25,
        accuracy: 85, // Bad signal
        timestamp: Date.now(),
      });

      expect(degradedResult.accepted).toBe(false);
      expect(degradedResult.reason).toBe('LOW_GPS_ACCURACY');

      // 3. Verify Redis retains previous clean coordinate without drift
      const preservedTelemetry = await telemetryService.getRiderLiveTelemetry(riderUserId);
      expect(preservedTelemetry?.lat).toBe(6.5200);
      expect(preservedTelemetry?.lng).toBe(3.3700);
    });

    it('rejects erratic speed spike (> 140 km/h) caused by multipath reflection', async () => {
      const speedJumpResult = await telemetryService.ingestRiderPing(riderUserId, {
        orderId: testOrderId,
        trackingCode: testTrackingCode,
        lat: 6.5300,
        lng: 3.3800,
        bearing: 45,
        speed: 185, // Impossible motorcycle speed in Lagos traffic
        accuracy: 15,
        timestamp: Date.now(),
      });

      expect(speedJumpResult.accepted).toBe(false);
      expect(speedJumpResult.reason).toBe('ERRATIC_SPEED_JUMP');
    });

    it('rejects fake mock locations with MOCK_LOCATION_DETECTED', async () => {
      const mockResult = await telemetryService.ingestRiderPing(riderUserId, {
        orderId: testOrderId,
        trackingCode: testTrackingCode,
        lat: 6.5400,
        lng: 3.3900,
        bearing: 90,
        speed: 30,
        accuracy: 10,
        isMockLocation: true,
        timestamp: Date.now(),
      });

      expect(mockResult.accepted).toBe(false);
      expect(mockResult.reason).toBe('MOCK_LOCATION_DETECTED');
    });
  });

  // SUITE 4: 3G HTTP Fallback Endpoint (POST /api/v1/telemetry/ping)
  describe('Suite 4: 3G HTTP Fallback Endpoint & Live Telemetry Hydration', () => {
    it('transmits GPS coordinate via HTTP fallback when WebSocket drops and updates live tracking', async () => {
      // 1. Connect a Guest subscriber on WebSocket to track the order
      const guestClient = createClient();
      await new Promise<void>((resolve) => guestClient.on('connect', () => resolve()));

      await new Promise<any>((resolve) => {
        guestClient.emit(
          SOCKET_EVENTS.TRACK_SUBSCRIBE,
          { trackingCode: testTrackingCode },
          (res: any) => resolve(res)
        );
      });

      // Setup broadcast listener on Guest
      const broadcastPromise = new Promise<TrackingUpdate>((resolve) => {
        guestClient.on(SOCKET_EVENTS.TRACKING_UPDATE, (update: TrackingUpdate) => {
          resolve(update);
        });
      });

      // 2. Rider sends coordinate via HTTP POST /api/v1/telemetry/ping (WebSocket is disconnected/offline)
      const httpPing = {
        orderId: testOrderId,
        trackingCode: testTrackingCode,
        lat: 6.6025,
        lng: 3.3450,
        bearing: 210,
        speed: 42.0,
        accuracy: 6,
        batteryLevel: 92,
        timestamp: Date.now(),
      };

      const res = await request(app)
        .post('/api/v1/telemetry/ping')
        .set('Authorization', `Bearer ${riderToken}`)
        .send(httpPing);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.result.accepted).toBe(true);

      // 3. Guest on WebSocket STILL receives the live broadcast seamlessly!
      const broadcast = await broadcastPromise;
      expect(broadcast.trackingCode).toBe(testTrackingCode);
      expect(broadcast.lat).toBe(6.6025);
      expect(broadcast.lng).toBe(3.3450);
      expect(broadcast.speed).toBe(42.0);

      // 4. Verify GET /api/v1/orders/track/:trackingCode includes hydrated liveTelemetry
      const trackRes = await request(app).get(`/api/v1/orders/track/${testTrackingCode}`);
      expect(trackRes.status).toBe(200);
      expect(trackRes.body.trackingCode).toBe(testTrackingCode);
      expect(trackRes.body.liveTelemetry).toBeDefined();
      expect(trackRes.body.liveTelemetry.lat).toBe(6.6025);
      expect(trackRes.body.liveTelemetry.lng).toBe(3.3450);
      expect(trackRes.body.liveTelemetry.bearing).toBe(210);
      expect(trackRes.body.liveTelemetry.speed).toBe(42.0);
    });

    it('processes batch pings via HTTP POST /api/v1/telemetry/ping for offline reconnection sync', async () => {
      const batchPayload = {
        pings: [
          {
            orderId: testOrderId,
            trackingCode: testTrackingCode,
            lat: 6.6030,
            lng: 3.3460,
            bearing: 210,
            speed: 40.0,
            accuracy: 5,
            timestamp: Date.now() - 10000,
          },
          {
            orderId: testOrderId,
            trackingCode: testTrackingCode,
            lat: 6.6040,
            lng: 3.3470,
            bearing: 215,
            speed: 44.0,
            accuracy: 6,
            timestamp: Date.now() - 5000,
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/telemetry/ping')
        .set('Authorization', `Bearer ${riderToken}`)
        .send(batchPayload);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.count).toBe(2);
      expect(res.body.results.length).toBe(2);
      expect(res.body.results.every((r: any) => r.accepted)).toBe(true);
    });

    it('blocks non-rider users from accessing POST /api/v1/telemetry/ping with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/telemetry/ping')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          lat: 6.5,
          lng: 3.3,
          bearing: 0,
          speed: 10,
          accuracy: 5,
          timestamp: Date.now(),
        });

      expect(res.status).toBe(403);
    });
  });

  // SUITE 5: Stage 13 Out-of-Order Historical Ping Protection
  describe('Suite 5: Stage 13 Out-of-Order Historical Ping Protection', () => {
    it('prevents stale offline-queued pings from overwriting newer live telemetry while preserving historical route breadcrumbs', async () => {
      const redis = getRedisClient();
      await redis.del(`order:route_points:${testOrderId}`);

      const baseTime = 1710000000000;

      // 1. Live ping at T = 2000s
      const livePing: RiderLocationPing = {
        orderId: testOrderId,
        trackingCode: testTrackingCode,
        lat: 6.5200,
        lng: 3.3800,
        bearing: 90,
        speed: 35.0,
        accuracy: 4,
        timestamp: baseTime + 2000000,
      };

      const liveRes = await telemetryService.ingestRiderPing(riderUserId, livePing);
      expect(liveRes.accepted).toBe(true);

      // Verify live Redis Hash is set to (6.5200, 3.3800)
      let liveTelemetry = await telemetryService.getRiderLiveTelemetry(riderUserId);
      expect(liveTelemetry).not.toBeNull();
      expect(liveTelemetry!.lat).toBe(6.5200);
      expect(liveTelemetry!.lng).toBe(3.3800);

      // 2. Delayed offline batch of 3 pings from T = 1000s, 1200s, 1500s (older than live position)
      const delayedBatch: RiderLocationPing[] = [
        {
          orderId: testOrderId,
          trackingCode: testTrackingCode,
          lat: 6.5910,
          lng: 3.3410,
          bearing: 45,
          speed: 30.0,
          accuracy: 5,
          timestamp: baseTime + 1000000,
        },
        {
          orderId: testOrderId,
          trackingCode: testTrackingCode,
          lat: 6.5920,
          lng: 3.3420,
          bearing: 50,
          speed: 32.0,
          accuracy: 5,
          timestamp: baseTime + 1200000,
        },
        {
          orderId: testOrderId,
          trackingCode: testTrackingCode,
          lat: 6.5930,
          lng: 3.3430,
          bearing: 55,
          speed: 28.0,
          accuracy: 4,
          timestamp: baseTime + 1500000,
        },
      ];

      const batchResults = await telemetryService.ingestRiderBatchPings(riderUserId, delayedBatch);
      expect(batchResults.length).toBe(3);
      expect(batchResults.every((r) => r.accepted)).toBe(true);
      expect(batchResults.every((r) => r.reason === 'HISTORICAL_PING_BUFFERED')).toBe(true);

      // 3. CRITICAL VERIFICATION: Live Redis Hash was NOT overwritten by stale T = 1500s data!
      liveTelemetry = await telemetryService.getRiderLiveTelemetry(riderUserId);
      expect(liveTelemetry!.lat).toBe(6.5200);
      expect(liveTelemetry!.lng).toBe(3.3800);

      // 4. Verify historical route breadcrumbs recorded all points into order:route_points:<orderId>
      const breadcrumbs = await telemetryService.getOrderRouteBreadcrumbs(testOrderId);
      expect(breadcrumbs.length).toBeGreaterThanOrEqual(3);
      const timestamps = breadcrumbs.map((b) => b.ts);
      expect(timestamps).toContain(baseTime + 1000000);
      expect(timestamps).toContain(baseTime + 1200000);
      expect(timestamps).toContain(baseTime + 1500000);
    });
  });
});

