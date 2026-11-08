import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../app';
import { connectMongo, disconnectMongo } from '../config/db';
import { closeRedis } from '../config/redis';
import {
  initSocketGateway,
  closeSocketGateway,
  emitJobOfferToRider,
  emitToTrackingRoom,
} from '../socket/socket.gateway';
import { User, Order } from '../models';
import { authService } from '../services/auth.service';
import {
  SOCKET_EVENTS,
  JobNewOffer,
  TrackingUpdate,
  getRiderRoom,
  getAdminFleetRoom,
} from '@logistics/shared-types';

describe('Stage 8: Socket.io Gateway, JWT Handshake Auth & Room Isolation', () => {
  let httpServer: http.Server;
  let serverPort: number;
  let riderUserId: string;
  let riderToken: string;
  let customerUserId: string;
  let customerToken: string;
  let activeClients: ClientSocket[] = [];

  const existingTrackingCode1 = 'LGS-888111';
  const existingTrackingCode2 = 'LGS-888222';

  // Helper to seed or re-seed orders
  async function seedSocketOrders() {
    await Order.findOneAndUpdate(
      { trackingCode: existingTrackingCode1 },
      {
        trackingCode: existingTrackingCode1,
        senderId: customerUserId,
        vehicleType: 'bike',
        paymentMethod: 'wallet',
        paymentStatus: 'paid',
        status: 'in_transit',
        estimatedDistanceKm: 8.5,
        totalFareKobo: 300000,
        platformCommissionKobo: 60000,
        riderEarningKobo: 240000,
        pickup: {
          address: 'Computer Village, Ikeja',
          landmark: 'Otigba Street',
          location: { type: 'Point', coordinates: [3.3421, 6.5933] },
          contactName: 'Sender 1',
          contactPhone: '+2348180001002',
          pickupPin: '1234',
        },
        stops: [
          {
            sequenceNumber: 1,
            recipientName: 'Recipient 1',
            recipientPhone: '+2348021112233',
            dropoffAddress: 'Victoria Island',
            dropoffLandmark: 'Adetokunbo Ademola',
            dropoffLocation: { type: 'Point', coordinates: [3.4219, 6.4281] },
            packageDescription: 'Laptop battery',
            deliveryPin: '5678',
            status: 'pending',
          },
        ],
      },
      { upsert: true, new: true }
    );

    await Order.findOneAndUpdate(
      { trackingCode: existingTrackingCode2 },
      {
        trackingCode: existingTrackingCode2,
        senderId: customerUserId,
        vehicleType: 'van',
        paymentMethod: 'wallet',
        paymentStatus: 'paid',
        status: 'searching_rider',
        estimatedDistanceKm: 14.0,
        totalFareKobo: 800000,
        platformCommissionKobo: 160000,
        riderEarningKobo: 640000,
        pickup: {
          address: 'Trade Fair Complex',
          landmark: 'Hall 2',
          location: { type: 'Point', coordinates: [3.2201, 6.4592] },
          contactName: 'Sender 2',
          contactPhone: '+2348180001002',
          pickupPin: '4321',
        },
        stops: [
          {
            sequenceNumber: 1,
            recipientName: 'Recipient 2',
            recipientPhone: '+2348029998877',
            dropoffAddress: 'Alaba Market',
            dropoffLandmark: 'Line B',
            dropoffLocation: { type: 'Point', coordinates: [3.1932, 6.4619] },
            packageDescription: 'Generator parts',
            deliveryPin: '8765',
            status: 'pending',
          },
        ],
      },
      { upsert: true, new: true }
    );
  }

  // Helper to create and track test socket clients for clean teardown
  function createClient(options?: { token?: string; query?: Record<string, string> }): ClientSocket {
    const socket = ioClient(`http://localhost:${serverPort}`, {
      auth: options?.token ? { token: options.token } : undefined,
      query: options?.query,
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    activeClients.push(socket);
    return socket;
  }

  beforeAll(async () => {
    await connectMongo();
    await Order.deleteMany({ trackingCode: { $in: [existingTrackingCode1, existingTrackingCode2] } });
    await User.deleteMany({ phone: { $regex: /^\+234818/ } });

    // 1. Create Rider User & Issue Token
    const rider = await User.create({
      fullName: 'Socket Rider Test',
      phone: '+2348180001001',
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

    // 2. Create Customer User & Issue Token
    const customer = await User.create({
      fullName: 'Socket Customer Test',
      phone: '+2348180001002',
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

    // 3. Create Orders in MongoDB for Subscription tests
    await seedSocketOrders();

    // 4. Start Ephemeral HTTP Server with Socket.io Gateway
    const app = createApp();
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

  beforeEach(async () => {
    await seedSocketOrders();
  });

  afterEach(() => {
    for (const client of activeClients) {
      if (client.connected) {
        client.disconnect();
      }
    }
    activeClients = [];
  });

  afterAll(async () => {
    // Disconnect all socket clients
    for (const client of activeClients) {
      if (client.connected) {
        client.disconnect();
      }
    }
    activeClients = [];

    await closeSocketGateway();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await Order.deleteMany({ trackingCode: { $in: [existingTrackingCode1, existingTrackingCode2] } });
    await User.deleteMany({ phone: { $regex: /^\+234818/ } });
    await disconnectMongo();
    await closeRedis();
  });

  // SUITE 1: JWT Handshake & Private Room Auto-Join
  describe('Suite 1: JWT Handshake & Private Room Auto-Join', () => {
    it('authenticates a Rider via handshake JWT and auto-joins rider private room', async () => {
      const riderClient = createClient({ token: riderToken });

      await new Promise<void>((resolve, reject) => {
        riderClient.on('connect', () => resolve());
        riderClient.on('connect_error', (err) => reject(err));
      });

      expect(riderClient.connected).toBe(true);

      // Verify Rider client receives private job offer broadcast
      const mockOffer: JobNewOffer = {
        orderId: 'ord_test_888',
        trackingCode: existingTrackingCode1,
        pickupAddress: 'Computer Village, Ikeja',
        pickupLandmark: 'Otigba Street',
        estimatedDistanceKm: 8.5,
        riderEarningKobo: 240000,
        stopsCount: 1,
        expiresAt: Date.now() + 30000,
      };

      const offerReceived = new Promise<JobNewOffer>((resolve) => {
        riderClient.on(SOCKET_EVENTS.JOB_NEW_OFFER, (data: JobNewOffer) => {
          resolve(data);
        });
      });

      // Emit to rider's private room
      emitJobOfferToRider(riderUserId, mockOffer);

      const receivedData = await offerReceived;
      expect(receivedData.orderId).toBe('ord_test_888');
      expect(receivedData.trackingCode).toBe(existingTrackingCode1);
      expect(receivedData.riderEarningKobo).toBe(240000);
    });

    it('rejects connection with tampered or invalid JWT with UNAUTHORIZED_SOCKET_TOKEN', async () => {
      const invalidClient = createClient({ token: 'tampered.jwt.token_signature_error' });

      const connectError = await new Promise<Error>((resolve) => {
        invalidClient.on('connect_error', (err) => resolve(err));
      });

      expect(connectError).toBeDefined();
      expect(connectError.message).toBe('UNAUTHORIZED_SOCKET_TOKEN');
      expect(invalidClient.connected).toBe(false);
    });
  });

  // SUITE 2: Public Guest Zero-Install Tracking Subscription
  describe('Suite 2: Public Guest Zero-Install Tracking Subscription', () => {
    it('allows unauthenticated guest to connect and subscribe to an existing tracking code', async () => {
      // No token provided -> guest mode
      const guestClient = createClient();

      await new Promise<void>((resolve, reject) => {
        guestClient.on('connect', () => resolve());
        guestClient.on('connect_error', (err) => reject(err));
      });

      expect(guestClient.connected).toBe(true);

      // Listen for initial status snapshot
      const snapshotPromise = new Promise<any>((resolve) => {
        guestClient.on(SOCKET_EVENTS.TRACK_SNAPSHOT, (data) => resolve(data));
      });

      // Emit track:subscribe
      const ackResponse = await new Promise<any>((resolve) => {
        guestClient.emit(
          SOCKET_EVENTS.TRACK_SUBSCRIBE,
          { trackingCode: existingTrackingCode1 },
          (res: any) => resolve(res)
        );
      });

      expect(ackResponse.ok).toBe(true);
      expect(ackResponse.room).toBe(`track:${existingTrackingCode1}`);

      // Verify initial snapshot data
      const snapshot = await snapshotPromise;
      expect(snapshot.trackingCode).toBe(existingTrackingCode1);
      expect(snapshot.status).toBe('in_transit');
      expect(snapshot.pickup.address).toBe('Computer Village, Ikeja');
      expect(snapshot.stops.length).toBe(1);
    });

    it('rejects track:subscribe for non-existent tracking code with ORDER_NOT_FOUND', async () => {
      const guestClient = createClient();

      await new Promise<void>((resolve) => guestClient.on('connect', () => resolve()));

      const ackResponse = await new Promise<any>((resolve) => {
        guestClient.emit(
          SOCKET_EVENTS.TRACK_SUBSCRIBE,
          { trackingCode: 'LGS-999999' },
          (res: any) => resolve(res)
        );
      });

      expect(ackResponse.ok).toBe(false);
      expect(ackResponse.code).toBe('ORDER_NOT_FOUND');
    });

    it('rejects track:subscribe for malformed tracking code format', async () => {
      const guestClient = createClient();
      await new Promise<void>((resolve) => guestClient.on('connect', () => resolve()));

      const ackResponse = await new Promise<any>((resolve) => {
        guestClient.emit(
          SOCKET_EVENTS.TRACK_SUBSCRIBE,
          { trackingCode: 'INVALID-CODE' },
          (res: any) => resolve(res)
        );
      });

      expect(ackResponse.ok).toBe(false);
      expect(ackResponse.code).toBe('INVALID_PAYLOAD');
    });
  });

  // SUITE 3: Strict Room Isolation (Cross-Tenant Leak Prevention)
  describe('Suite 3: Strict Room Isolation (Zero Cross-Tenant Leakage)', () => {
    it('ensures updates to order A are received ONLY by subscriber A and not subscriber B', async () => {
      const subscriberA = createClient();
      const subscriberB = createClient();

      await Promise.all([
        new Promise<void>((resolve) => subscriberA.on('connect', () => resolve())),
        new Promise<void>((resolve) => subscriberB.on('connect', () => resolve())),
      ]);

      // Subscribe A to Order 1
      await new Promise<any>((resolve) => {
        subscriberA.emit(
          SOCKET_EVENTS.TRACK_SUBSCRIBE,
          { trackingCode: existingTrackingCode1 },
          (res: any) => resolve(res)
        );
      });

      // Subscribe B to Order 2
      await new Promise<any>((resolve) => {
        subscriberB.emit(
          SOCKET_EVENTS.TRACK_SUBSCRIBE,
          { trackingCode: existingTrackingCode2 },
          (res: any) => resolve(res)
        );
      });

      let subscriberBReceivedUpdate = false;
      subscriberB.on(SOCKET_EVENTS.TRACKING_UPDATE, () => {
        subscriberBReceivedUpdate = true;
      });

      const updatePromiseA = new Promise<TrackingUpdate>((resolve) => {
        subscriberA.on(SOCKET_EVENTS.TRACKING_UPDATE, (update: TrackingUpdate) => {
          resolve(update);
        });
      });

      // Broadcast update strictly to Order 1 room
      const testUpdate: TrackingUpdate = {
        trackingCode: existingTrackingCode1,
        riderId: riderUserId,
        lat: 6.5569,
        lng: 3.3524,
        bearing: 135,
        speed: 32.5,
        status: 'in_transit',
        etaMinutes: 18,
        updatedAt: Date.now(),
      };

      emitToTrackingRoom(existingTrackingCode1, testUpdate);

      const receivedUpdate = await updatePromiseA;
      expect(receivedUpdate.trackingCode).toBe(existingTrackingCode1);
      expect(receivedUpdate.speed).toBe(32.5);
      expect(receivedUpdate.lat).toBe(6.5569);

      // Give 100ms and verify Subscriber B received absolutely nothing
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(subscriberBReceivedUpdate).toBe(false);
    });
  });

  // SUITE 4: Unauthorized Room Escalation Prevention
  describe('Suite 4: Unauthorized Room Escalation Prevention', () => {
    it('blocks an unauthenticated guest from joining a rider private room', async () => {
      const guestClient = createClient();
      await new Promise<void>((resolve) => guestClient.on('connect', () => resolve()));

      const ackResponse = await new Promise<any>((resolve) => {
        guestClient.emit(
          SOCKET_EVENTS.ROOM_JOIN_PRIVATE,
          { room: getRiderRoom(riderUserId) },
          (res: any) => resolve(res)
        );
      });

      expect(ackResponse.ok).toBe(false);
      expect(ackResponse.code).toBe('FORBIDDEN_ROOM_ACCESS');
    });

    it('blocks a customer from joining the admin:fleet room', async () => {
      const customerClient = createClient({ token: customerToken });
      await new Promise<void>((resolve) => customerClient.on('connect', () => resolve()));

      const ackResponse = await new Promise<any>((resolve) => {
        customerClient.emit(
          SOCKET_EVENTS.ROOM_JOIN_PRIVATE,
          { room: getAdminFleetRoom() },
          (res: any) => resolve(res)
        );
      });

      expect(ackResponse.ok).toBe(false);
      expect(ackResponse.code).toBe('FORBIDDEN_ROOM_ACCESS');
    });
  });

  // SUITE 5: Reconnect & Re-Subscription Resilience
  describe('Suite 5: Reconnect & Re-Subscription Resilience', () => {
    it('re-subscribes cleanly after manual disconnect without duplicate events', async () => {
      const client = createClient();
      await new Promise<void>((resolve) => client.on('connect', () => resolve()));

      // Initial Subscribe
      await new Promise<any>((resolve) => {
        client.emit(
          SOCKET_EVENTS.TRACK_SUBSCRIBE,
          { trackingCode: existingTrackingCode1 },
          (res: any) => resolve(res)
        );
      });

      // Disconnect
      client.disconnect();
      expect(client.connected).toBe(false);

      // Reconnect
      client.connect();
      await new Promise<void>((resolve) => client.on('connect', () => resolve()));
      expect(client.connected).toBe(true);

      // Re-subscribe
      const reSubAck = await new Promise<any>((resolve) => {
        client.emit(
          SOCKET_EVENTS.TRACK_SUBSCRIBE,
          { trackingCode: existingTrackingCode1 },
          (res: any) => resolve(res)
        );
      });
      expect(reSubAck.ok).toBe(true);

      // Verify it receives fresh broadcast
      let receiveCount = 0;
      client.on(SOCKET_EVENTS.TRACKING_UPDATE, () => {
        receiveCount++;
      });

      emitToTrackingRoom(existingTrackingCode1, {
        trackingCode: existingTrackingCode1,
        riderId: riderUserId,
        lat: 6.5000,
        lng: 3.3600,
        bearing: 90,
        speed: 25.0,
        status: 'in_transit',
        updatedAt: Date.now(),
      });

      await new Promise((resolve) => setTimeout(resolve, 150));
      // Exactly ONE event should be received (no duplicate listeners)
      expect(receiveCount).toBe(1);
    });
  });
});
