import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectMongo, disconnectMongo } from '../config/db';
import { getRedisClient, closeRedis } from '../config/redis';
import { User, Order, RiderProfile, Wallet } from '../models';
import { authService } from '../services/auth.service';
import { dispatchService } from '../services/dispatch.service';
import { notificationService } from '../services/notification.service';
import {
  clearMockNotifications,
  getNotificationsForOrder,
  mockSentNotifications,
} from '../providers/termii.provider';

const app = createApp();

describe('Stage 16: Automated Termii DND SMS & WhatsApp Notifications (Zero-Install Tracking Link + Secret 4-Digit PIN Dispatch)', () => {
  let customerUser: any;
  let customerUserId: string;
  let customerToken: string;

  let riderUser: any;
  let riderUserId: string;
  let riderToken: string;

  beforeAll(async () => {
    await connectMongo();
    await User.deleteMany({ phone: { $regex: /^\+234812/ } });
    await RiderProfile.deleteMany({ plateNumber: { $regex: /NOTIF-16/ } });
    await Order.deleteMany({ trackingCode: { $regex: /LGS-NOTIF/ } });

    // 1. Create Verified Sender / Customer
    customerUser = await User.create({
      fullName: 'Yewande Kuti (Sender)',
      phone: '+2348120001001',
      role: 'customer',
      isVerified: true,
      passwordHash: 'hashedpass',
    });
    customerUserId = customerUser._id.toString();
    const cTokens = await authService.createTokens({
      id: customerUserId,
      role: 'customer',
      phone: customerUser.phone,
      isVerified: true,
    });
    customerToken = cTokens.accessToken;

    // Fund customer wallet so wallet order can be paid
    await Wallet.findOneAndUpdate(
      { userId: customerUserId },
      { balanceKobo: 500000 },
      { upsert: true }
    );

    // 2. Create Verified Rider & Profile
    riderUser = await User.create({
      fullName: 'Chinedu Eze (Dispatch Rider)',
      phone: '+2348120001002',
      role: 'rider',
      isVerified: true,
      passwordHash: 'hashedpass',
    });
    riderUserId = riderUser._id.toString();
    const rTokens = await authService.createTokens({
      id: riderUserId,
      role: 'rider',
      phone: riderUser.phone,
      isVerified: true,
    });
    riderToken = rTokens.accessToken;

    await RiderProfile.create({
      userId: riderUser._id,
      vehicleType: 'bike',
      plateNumber: 'NOTIF-16-XYZ',
      ridersCardNumber: 'RC-NOTIF-16',
      ridersCardDocumentUrl: 'https://docs.test/rc-notif16.jpg',
      status: 'available',
      rating: 4.9,
      lastLocation: {
        type: 'Point',
        coordinates: [3.3792, 6.5244], // [lng, lat]
      },
    });

    const redis = getRedisClient();
    await redis.geoadd('riders:available:locations', 3.3792, 6.5244, riderUserId);
  });

  afterAll(async () => {
    const redis = getRedisClient();
    await redis.zrem('riders:available:locations', riderUserId);
    await User.deleteMany({ phone: { $regex: /^\+234812/ } });
    await RiderProfile.deleteMany({ plateNumber: { $regex: /NOTIF-16/ } });
    await Order.deleteMany({ trackingCode: { $regex: /LGS-NOTIF/ } });
    await disconnectMongo();
    await closeRedis();
  });

  beforeEach(() => {
    clearMockNotifications();
  });

  describe('Suite 1: Sender Notification on Order Creation (`order_created_sender`)', () => {
    it('dispatches DND SMS to sender containing Pickup PIN and zero-install live tracking URL', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          paymentMethod: 'pay_on_delivery',
          pickup: {
            address: '12 Isaac John Street, GRA Ikeja',
            landmark: 'Opposite Radisson Blu',
            location: { lat: 6.5912, lng: 3.3587 },
            contactName: 'Yewande Kuti',
            contactPhone: '+2348120001001',
          },
          stops: [
            {
              dropoffAddress: 'Ahmadu Bello Way, Victoria Island',
              dropoffLandmark: 'Silverbird Galleria',
              dropoffLocation: { lat: 6.4281, lng: 3.4219 },
              contactName: 'Fola Adebayo',
              contactPhone: '+2348120001003',
              recipientName: 'Fola Adebayo',
              recipientPhone: '+2348120001003',
              packageDescription: 'Important Legal Briefcase',
            },
          ],
        });

      expect(res.status).toBe(201);
      const createdOrder = res.body.order;
      const trackingCode = createdOrder.trackingCode;
      const pickupPin = createdOrder.pickup.pickupPin;

      expect(pickupPin).toMatch(/^\d{4}$/);

      // Verify notification outbox
      const orderNotifs = getNotificationsForOrder(trackingCode);
      expect(orderNotifs.length).toBeGreaterThanOrEqual(1);

      const senderNotif = orderNotifs.find((n) => n.eventType === 'order_created_sender');
      expect(senderNotif).toBeDefined();
      expect(senderNotif?.recipientPhone).toBe('+2348120001001');
      expect(senderNotif?.channel).toBe('sms_dnd');
      expect(senderNotif?.message).toContain(`Secret 4-digit Pickup PIN: ${pickupPin}`);
      expect(senderNotif?.message).toContain(`/track/${trackingCode}`);
      expect(senderNotif?.trackingUrl).toContain(`/track/${trackingCode}`);

      // Verify via public notifications endpoint
      const queryRes = await request(app)
        .get(`/api/v1/orders/track/${trackingCode}/notifications`);
      expect(queryRes.status).toBe(200);
      expect(queryRes.body.ok).toBe(true);
      expect(queryRes.body.trackingCode).toBe(trackingCode);
      expect(queryRes.body.notifications.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Suite 2: Multi-Stop In-Transit Isolated Recipient PIN Dispatch (`in_transit_recipient_pin`)', () => {
    let multiStopOrder: any;

    beforeAll(async () => {
      multiStopOrder = await Order.create({
        trackingCode: 'LGS-NOTIF-MULTI',
        senderId: customerUser._id,
        riderId: riderUser._id,
        status: 'arrived_pickup',
        vehicleType: 'bike',
        paymentMethod: 'pay_on_delivery',
        paymentStatus: 'unpaid',
        estimatedDistanceKm: 15.2,
        totalFareKobo: 320000,
        platformCommissionKobo: 64000,
        riderEarningKobo: 256000,
        pickup: {
          address: 'Marina, Lagos Island',
          landmark: 'Marina Car Park',
          location: { type: 'Point', coordinates: [3.39, 6.45] },
          contactName: 'Yewande Kuti',
          contactPhone: '+2348120001001',
          pickupPin: '5821',
        },
        stops: [
          {
            sequenceNumber: 1,
            recipientName: 'Tunde Bakare (Stop 1)',
            recipientPhone: '+2348120001004',
            dropoffAddress: 'Broad Street, Lagos Island',
            dropoffLandmark: 'CMS Bookshop',
            dropoffLocation: { type: 'Point', coordinates: [3.395, 6.455] },
            packageDescription: 'Documents Box 1',
            deliveryPin: '1122',
            status: 'pending',
          },
          {
            sequenceNumber: 2,
            recipientName: 'Amina Bello (Stop 2)',
            recipientPhone: '+2348120001005',
            dropoffAddress: 'Bourdillon Road, Ikoyi',
            dropoffLandmark: 'Near NNPC',
            dropoffLocation: { type: 'Point', coordinates: [3.435, 6.448] },
            packageDescription: 'Package Box 2',
            deliveryPin: '3344',
            status: 'pending',
          },
        ],
      });
    });

    it('dispatches isolated PINs: Stop 1 recipient receives only 1122 and Stop 2 recipient receives only 3344', async () => {
      clearMockNotifications();

      // Rider verifies pickup PIN
      const res = await request(app)
        .post(`/api/v1/dispatch/orders/${multiStopOrder._id}/verify-pickup`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({ pickupPin: '5821' });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('in_transit');

      const notifications = getNotificationsForOrder('LGS-NOTIF-MULTI');
      const inTransitNotifs = notifications.filter((n) => n.eventType === 'in_transit_recipient_pin');

      expect(inTransitNotifs).toHaveLength(2);

      // Verify Stop 1 Notification Isolation
      const stop1Notif = inTransitNotifs.find((n) => n.recipientPhone === '+2348120001004');
      expect(stop1Notif).toBeDefined();
      expect(stop1Notif?.message).toContain('Your secret 4-digit Delivery PIN is: 1122');
      expect(stop1Notif?.message).toContain('Stop #1');
      expect(stop1Notif?.message).toContain('Chinedu Eze');
      expect(stop1Notif?.message).toContain('NOTIF-16-XYZ');
      expect(stop1Notif?.message).not.toContain('3344'); // NEVER leaks Stop 2 PIN!

      // Verify Stop 2 Notification Isolation
      const stop2Notif = inTransitNotifs.find((n) => n.recipientPhone === '+2348120001005');
      expect(stop2Notif).toBeDefined();
      expect(stop2Notif?.message).toContain('Your secret 4-digit Delivery PIN is: 3344');
      expect(stop2Notif?.message).toContain('Stop #2');
      expect(stop2Notif?.message).toContain('Chinedu Eze');
      expect(stop2Notif?.message).toContain('NOTIF-16-XYZ');
      expect(stop2Notif?.message).not.toContain('1122'); // NEVER leaks Stop 1 PIN!
    });
  });

  describe('Suite 3: Rider Arrived at Drop-off Location Alert (`arrived_dropoff_recipient`)', () => {
    let order: any;

    beforeAll(async () => {
      order = await Order.create({
        trackingCode: 'LGS-NOTIF-ARRIVE',
        senderId: customerUser._id,
        riderId: riderUser._id,
        status: 'in_transit',
        vehicleType: 'bike',
        paymentMethod: 'pay_on_delivery',
        paymentStatus: 'unpaid',
        estimatedDistanceKm: 6.0,
        totalFareKobo: 150000,
        platformCommissionKobo: 30000,
        riderEarningKobo: 120000,
        pickup: {
          address: 'Surulere',
          landmark: 'National Stadium',
          location: { type: 'Point', coordinates: [3.36, 6.5] },
          contactName: 'Yewande Kuti',
          contactPhone: '+2348120001001',
          pickupPin: '1234',
        },
        stops: [
          {
            sequenceNumber: 1,
            recipientName: 'Kola Ojo',
            recipientPhone: '+2348120001006',
            dropoffAddress: 'Bode Thomas, Surulere',
            dropoffLandmark: 'Adeniran Ogunsanya Mall',
            dropoffLocation: { type: 'Point', coordinates: [3.355, 6.495] },
            packageDescription: 'Electronics',
            deliveryPin: '7788',
            status: 'en_route',
          },
        ],
      });
    });

    it('dispatches arrival alert with rider contact details and delivery PIN reminder to recipient', async () => {
      clearMockNotifications();

      const res = await request(app)
        .patch(`/api/v1/dispatch/orders/${order._id}/state`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          status: 'arrived_dropoff',
          stopSequenceNumber: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('arrived_dropoff');

      const notifications = getNotificationsForOrder('LGS-NOTIF-ARRIVE');
      const arrivalNotif = notifications.find((n) => n.eventType === 'arrived_dropoff_recipient');

      expect(arrivalNotif).toBeDefined();
      expect(arrivalNotif?.recipientPhone).toBe('+2348120001006');
      expect(arrivalNotif?.message).toContain('Chinedu Eze');
      expect(arrivalNotif?.message).toContain('has arrived at your destination');
      expect(arrivalNotif?.message).toContain('secret 4-digit Delivery PIN: 7788');
      expect(arrivalNotif?.trackingUrl).toContain('/track/LGS-NOTIF-ARRIVE');
    });
  });

  describe('Suite 4: Order Delivered Final Confirmation & Receipt to Sender (`order_delivered_receipt`)', () => {
    let order: any;

    beforeAll(async () => {
      order = await Order.create({
        trackingCode: 'LGS-NOTIF-RECEIPT',
        senderId: customerUser._id,
        riderId: riderUser._id,
        status: 'arrived_dropoff',
        vehicleType: 'bike',
        paymentMethod: 'pay_on_delivery',
        paymentStatus: 'unpaid',
        estimatedDistanceKm: 8.5,
        totalFareKobo: 250000,
        platformCommissionKobo: 50000,
        riderEarningKobo: 200000,
        pickup: {
          address: 'Gbagada Phase 2',
          landmark: 'Charly Boy Bus Stop',
          location: { type: 'Point', coordinates: [3.38, 6.55] },
          contactName: 'Yewande Kuti',
          contactPhone: '+2348120001001',
          pickupPin: '4321',
        },
        stops: [
          {
            sequenceNumber: 1,
            recipientName: 'Segun Arinze',
            recipientPhone: '+2348120001007',
            dropoffAddress: 'Anthony Village',
            dropoffLandmark: 'Ajao Road',
            dropoffLocation: { type: 'Point', coordinates: [3.37, 6.56] },
            packageDescription: 'Office Supplies',
            deliveryPin: '9900',
            status: 'en_route',
          },
        ],
      });
    });

    it('dispatches delivery receipt and total fare in Naira to the sender upon final delivery completion', async () => {
      clearMockNotifications();

      const validPod = 'data:image/jpeg;base64,' + Buffer.from('mock pod image data').toString('base64');

      const res = await request(app)
        .post(`/api/v1/dispatch/orders/${order._id}/verify-delivery`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          stopSequenceNumber: 1,
          deliveryPin: '9900',
          proofOfDeliveryBase64OrUrl: validPod,
        });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('delivered');

      const notifications = getNotificationsForOrder('LGS-NOTIF-RECEIPT');
      const receiptNotif = notifications.find((n) => n.eventType === 'order_delivered_receipt');

      expect(receiptNotif).toBeDefined();
      expect(receiptNotif?.recipientPhone).toBe('+2348120001001');
      expect(receiptNotif?.message).toContain('delivered successfully');
      expect(receiptNotif?.message).toContain('Fare settled: ₦2,500.00');
      expect(receiptNotif?.trackingUrl).toContain('/track/LGS-NOTIF-RECEIPT');
    });
  });

  describe('Suite 5: 24-Hour Redis Idempotency Lock Guard', () => {
    it('prevents duplicate notification dispatches for the same event and order', async () => {
      const order = await Order.create({
        trackingCode: 'LGS-NOTIF-IDEMP',
        senderId: customerUser._id,
        status: 'pending',
        vehicleType: 'bike',
        paymentMethod: 'pay_on_delivery',
        paymentStatus: 'unpaid',
        estimatedDistanceKm: 5.0,
        totalFareKobo: 120000,
        platformCommissionKobo: 24000,
        riderEarningKobo: 96000,
        pickup: {
          address: 'Ikeja City Mall',
          landmark: 'ICM Car Park',
          location: { type: 'Point', coordinates: [3.35, 6.6] },
          contactName: 'Yewande Kuti',
          contactPhone: '+2348120001001',
          pickupPin: '6655',
        },
        stops: [
          {
            sequenceNumber: 1,
            recipientName: 'Idempotency Tester',
            recipientPhone: '+2348120001008',
            dropoffAddress: 'Oregun',
            dropoffLandmark: 'Clay Bus Stop',
            dropoffLocation: { type: 'Point', coordinates: [3.36, 6.61] },
            packageDescription: 'Test Box',
            deliveryPin: '4433',
            status: 'pending',
          },
        ],
      });

      clearMockNotifications();

      // First call succeeds
      const firstResult = await notificationService.notifyOrderCreatedToSender(order as any);
      expect(firstResult).not.toBeNull();
      expect(mockSentNotifications.length).toBe(1);

      // Second call is blocked by Redis idempotency lock (24h TTL)
      const secondResult = await notificationService.notifyOrderCreatedToSender(order as any);
      expect(secondResult).toBeNull();
      expect(mockSentNotifications.length).toBe(1); // No new message sent!
    });
  });
});
