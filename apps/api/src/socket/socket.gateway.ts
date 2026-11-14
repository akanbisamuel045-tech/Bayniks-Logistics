import http from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import {
  SOCKET_EVENTS,
  TrackingUpdate,
  JobNewOffer,
  RiderLocationPingSchema,
  TrackSubscribePayloadSchema,
  DispatchOfferRespondSchema,
  ChatMessagePayloadSchema,
  RiderEmergencySosPayloadSchema,
  getRiderRoom,
  getCustomerRoom,
  getVendorRoom,
  getTrackingRoom,
  getAdminFleetRoom,
  getOrderRoom,
  getEmergencySosRoom,
  fromGeoJsonPoint,
  UserRole,
} from '@logistics/shared-types';
import { DEFAULT_REDIS_URL, getRedisClient } from '../config/redis';
import { authService, AccessTokenPayload } from '../services/auth.service';
import { Order } from '../models';
import { telemetryService } from '../services/telemetry.service';
import { dispatchService } from '../services/dispatch.service';

export interface AuthenticatedSocketData {
  user: {
    id: string;
    role: UserRole;
    phone: string;
    isVerified: boolean;
  } | null;
  isGuest: boolean;
}

let ioInstance: Server | null = null;
let pubClientInstance: Redis | null = null;
let subClientInstance: Redis | null = null;

/**
 * Initializes the Socket.io Gateway with Redis Pub/Sub adapter and dual-mode handshake auth.
 */
export function initSocketGateway(httpServer: http.Server): Server {
  const io = new Server(httpServer, {
    // Nigerian 3G/4G mobile network resilience settings
    pingInterval: 10000, // 10s heartbeat
    pingTimeout: 5000,   // 5s timeout to detect dropped bike connections quickly
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Attach Redis Pub/Sub adapter for horizontal clustering
  pubClientInstance = new Redis(DEFAULT_REDIS_URL, { maxRetriesPerRequest: 3 });
  subClientInstance = pubClientInstance.duplicate();
  io.adapter(createAdapter(pubClientInstance, subClientInstance));

  // Dual-mode handshake authentication middleware
  io.use((socket: Socket<any, any, any, AuthenticatedSocketData>, next) => {
    const rawAuth = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    const token = typeof rawAuth === 'string'
      ? rawAuth.startsWith('Bearer ')
        ? rawAuth.slice(7).trim()
        : rawAuth.trim()
      : null;

    if (!token) {
      // Allow unauthenticated guest connections for zero-install recipient tracking
      socket.data.isGuest = true;
      socket.data.user = null;
      return next();
    }

    try {
      const payload: AccessTokenPayload = authService.verifyAccessToken(token);
      socket.data.isGuest = false;
      socket.data.user = {
        id: payload.sub,
        role: payload.role,
        phone: payload.phone,
        isVerified: payload.isVerified,
      };
      return next();
    } catch {
      return next(new Error('UNAUTHORIZED_SOCKET_TOKEN'));
    }
  });

  // Connection & Room Management
  io.on('connection', async (socket: Socket<any, any, any, AuthenticatedSocketData>) => {
    const { user, isGuest } = socket.data;

    // Auto-join isolated private rooms for authenticated roles
    if (!isGuest && user) {
      if (user.role === 'rider') {
        const room = getRiderRoom(user.id);
        socket.join(room);
      } else if (user.role === 'customer') {
        const room = getCustomerRoom(user.id);
        socket.join(room);
      } else if (user.role === 'vendor') {
        const room = getVendorRoom(user.id);
        socket.join(room);
      } else if (user.role === 'admin' || user.role === 'fleet_owner') {
        const room = getAdminFleetRoom();
        socket.join(room);
      }
    }

    // EVENT: track:subscribe (Public or Authenticated)
    socket.on(
      SOCKET_EVENTS.TRACK_SUBSCRIBE,
      async (rawPayload: unknown, callback?: (res: { ok: boolean; room?: string; error?: string; code?: string }) => void) => {
        try {
          const parsed = TrackSubscribePayloadSchema.safeParse(rawPayload);
          if (!parsed.success) {
            callback?.({
              ok: false,
              code: 'INVALID_PAYLOAD',
              error: 'Invalid tracking code format',
            });
            return;
          }

          const trackingCode = parsed.data.trackingCode.toUpperCase();
          const order = await Order.findOne({ trackingCode }).lean();
          if (!order) {
            callback?.({
              ok: false,
              code: 'ORDER_NOT_FOUND',
              error: 'Order with provided tracking code not found',
            });
            return;
          }

          const room = getTrackingRoom(trackingCode);
          socket.join(room);

          callback?.({ ok: true, room });

          // Send immediate initial status snapshot to the newly subscribed subscriber
          socket.emit(SOCKET_EVENTS.TRACK_SNAPSHOT, {
            trackingCode: order.trackingCode,
            status: order.status,
            vehicleType: order.vehicleType,
            estimatedDistanceKm: order.estimatedDistanceKm,
            totalFareKobo: order.totalFareKobo,
            pickup: {
              address: order.pickup.address,
              landmark: order.pickup.landmark,
              location: fromGeoJsonPoint(order.pickup.location as any),
            },
            stops: order.stops.map((s: any) => ({
              sequenceNumber: s.sequenceNumber,
              recipientName: s.recipientName,
              dropoffAddress: s.dropoffAddress,
              dropoffLandmark: s.dropoffLandmark,
              dropoffLocation: fromGeoJsonPoint(s.dropoffLocation as any),
              status: s.status,
            })),
            encodedRoutePolyline: order.encodedRoutePolyline,
          });
        } catch (error: any) {
          callback?.({
            ok: false,
            code: 'INTERNAL_ERROR',
            error: error?.message || 'Failed to subscribe to tracking room',
          });
        }
      }
    );

    // EVENT: track:unsubscribe
    socket.on(
      SOCKET_EVENTS.TRACK_UNSUBSCRIBE,
      (rawPayload: unknown, callback?: (res: { ok: boolean }) => void) => {
        if (typeof rawPayload === 'object' && rawPayload && 'trackingCode' in rawPayload) {
          const code = String((rawPayload as any).trackingCode).toUpperCase();
          socket.leave(getTrackingRoom(code));
        }
        callback?.({ ok: true });
      }
    );

    // EVENT: room:join_private (Security Guard: Prevents cross-tenant room sniffing)
    socket.on(
      SOCKET_EVENTS.ROOM_JOIN_PRIVATE,
      (rawPayload: { room?: string }, callback?: (res: { ok: boolean; code?: string; error?: string }) => void) => {
        const targetRoom = rawPayload?.room;
        if (!targetRoom || isGuest || !user) {
          callback?.({ ok: false, code: 'FORBIDDEN_ROOM_ACCESS', error: 'Unauthenticated clients cannot join private rooms' });
          return;
        }

        // Only allow a user to join their own room, or admins to join admin room
        const allowedRider = user.role === 'rider' && targetRoom === getRiderRoom(user.id);
        const allowedCustomer = user.role === 'customer' && targetRoom === getCustomerRoom(user.id);
        const allowedVendor = user.role === 'vendor' && targetRoom === getVendorRoom(user.id);
        const allowedAdmin = (user.role === 'admin' || user.role === 'fleet_owner') && targetRoom === getAdminFleetRoom();

        if (allowedRider || allowedCustomer || allowedVendor || allowedAdmin) {
          socket.join(targetRoom);
          callback?.({ ok: true });
        } else {
          callback?.({ ok: false, code: 'FORBIDDEN_ROOM_ACCESS', error: 'Unauthorized to join private room' });
        }
      }
    );

    // EVENT: rider:location_ping (High-Frequency 5s Telemetry Ingestion)
    socket.on(
      SOCKET_EVENTS.RIDER_LOCATION_PING,
      async (
        rawPayload: unknown,
        callback?: (res: { ok: boolean; result?: any; error?: string; code?: string }) => void
      ) => {
        if (isGuest || !user || user.role !== 'rider') {
          callback?.({
            ok: false,
            code: 'FORBIDDEN_ROLE',
            error: 'Only authenticated riders can transmit location pings',
          });
          return;
        }

        const parsed = RiderLocationPingSchema.safeParse(rawPayload);
        if (!parsed.success) {
          callback?.({
            ok: false,
            code: 'INVALID_PAYLOAD',
            error: 'Invalid rider location ping payload',
          });
          return;
        }

        try {
          const result = await telemetryService.ingestRiderPing(user.id, parsed.data);
          callback?.({ ok: true, result });
        } catch (error: any) {
          callback?.({
            ok: false,
            code: 'INGEST_ERROR',
            error: error?.message || 'Failed to ingest telemetry ping',
          });
        }
      }
    );

    // EVENT: job:respond_offer (Rider accepts or declines offer over WebSocket)
    socket.on(
      SOCKET_EVENTS.JOB_RESPOND_OFFER,
      async (
        rawPayload: unknown,
        callback?: (res: { ok: boolean; action?: string; order?: any; error?: string; code?: string }) => void
      ) => {
        if (isGuest || !user || user.role !== 'rider') {
          callback?.({
            ok: false,
            code: 'FORBIDDEN_ROLE',
            error: 'Only authenticated riders can respond to job offers',
          });
          return;
        }

        const parsed = DispatchOfferRespondSchema.safeParse(rawPayload);
        if (!parsed.success) {
          callback?.({
            ok: false,
            code: 'INVALID_PAYLOAD',
            error: 'Invalid dispatch offer response payload',
          });
          return;
        }

        try {
          if (parsed.data.action === 'accept') {
            const sanitizedOrder = await dispatchService.acceptOrderOffer(user.id, parsed.data.orderId);
            callback?.({ ok: true, action: 'accept', order: sanitizedOrder });
          } else {
            const result = await dispatchService.declineOrderOffer(user.id, parsed.data.orderId);
            callback?.({ action: 'decline', ...result });
          }
        } catch (error: any) {
          callback?.({
            ok: false,
            code: error.code || 'DISPATCH_ERROR',
            error: error.message || 'Failed to process offer response',
          });
        }
      }
    );

    // EVENT: chat:send_message (Customer/Rider live message)
    socket.on(
      SOCKET_EVENTS.CHAT_SEND_MESSAGE,
      async (
        rawPayload: unknown,
        callback?: (res: { ok: boolean; message?: any; error?: string }) => void
      ) => {
        const parsed = ChatMessagePayloadSchema.safeParse(rawPayload);
        if (!parsed.success) {
          callback?.({ ok: false, error: 'Invalid chat message payload' });
          return;
        }

        try {
          const { orderId, senderRole, senderName, text } = parsed.data;
          const order = await Order.findById(orderId);
          if (!order) {
            callback?.({ ok: false, error: 'Order not found' });
            return;
          }

          const msg = {
            senderId: user ? new mongoose.Types.ObjectId(user.id) : undefined,
            senderRole,
            senderName,
            text,
            createdAt: new Date(),
          };

          order.messages.push(msg as any);
          await order.save();

          const broadcastPayload = {
            _id: (order.messages[order.messages.length - 1] as any)?._id,
            orderId,
            senderRole,
            senderName,
            text,
            createdAt: msg.createdAt,
          };

          io.to(getOrderRoom(orderId)).emit(SOCKET_EVENTS.CHAT_MESSAGE_RECEIVED, broadcastPayload);
          io.to(getTrackingRoom(order.trackingCode)).emit(SOCKET_EVENTS.CHAT_MESSAGE_RECEIVED, broadcastPayload);

          callback?.({ ok: true, message: broadcastPayload });
        } catch (error: any) {
          callback?.({ ok: false, error: error?.message || 'Failed to send message' });
        }
      }
    );

    // EVENT: rider:emergency_sos (High-priority SOS trigger)
    socket.on(
      SOCKET_EVENTS.RIDER_EMERGENCY_SOS,
      async (
        rawPayload: unknown,
        callback?: (res: { ok: boolean; sosTicket?: string; error?: string }) => void
      ) => {
        const parsed = RiderEmergencySosPayloadSchema.safeParse(rawPayload);
        if (!parsed.success) {
          callback?.({ ok: false, error: 'Invalid SOS payload' });
          return;
        }

        try {
          const riderId = user?.id || 'unknown';
          const sosTicket = `SOS-${Date.now().toString().slice(-6)}`;
          const redis = getRedisClient();

          await redis.set(
            `rider:emergency:${riderId}`,
            JSON.stringify({ ...parsed.data, riderId, sosTicket, timestamp: Date.now() }),
            'EX',
            86400
          );

          const alertPayload = {
            sosTicket,
            riderId,
            riderPhone: user?.phone,
            ...parsed.data,
          };

          io.to(getEmergencySosRoom()).emit(SOCKET_EVENTS.RIDER_EMERGENCY_SOS, alertPayload);
          io.to(getAdminFleetRoom()).emit(SOCKET_EVENTS.RIDER_EMERGENCY_SOS, alertPayload);

          callback?.({ ok: true, sosTicket });
        } catch (error: any) {
          callback?.({ ok: false, error: error?.message || 'Failed to log SOS alert' });
        }
      }
    );

    socket.on('disconnect', () => {
      // Auto cleans up socket rooms
    });
  });

  ioInstance = io;
  return io;
}

/**
 * Retrieves the active Socket.io server instance.
 */
export function getIO(): Server {
  if (!ioInstance) {
    throw new Error('Socket.io gateway has not been initialized. Call initSocketGateway(httpServer) first.');
  }
  return ioInstance;
}

/**
 * Broadcasts sub-second GPS coordinate telemetry to subscribers of a tracking code.
 */
export function emitToTrackingRoom(trackingCode: string, payload: TrackingUpdate): void {
  const io = getIO();
  io.to(getTrackingRoom(trackingCode)).emit(SOCKET_EVENTS.TRACKING_UPDATE, payload);
}

/**
 * Broadcasts events to the admin / fleet owner room for God's Eye live fleet map.
 */
export function emitToAdminFleet(event: string, payload: unknown): void {
  const io = getIO();
  io.to(getAdminFleetRoom()).emit(event, payload);
}

/**
 * Dispatches a new job offer with a 30s countdown to an individual idle rider.
 */
export function emitJobOfferToRider(riderUserId: string, payload: JobNewOffer): void {
  const io = getIO();
  io.to(getRiderRoom(riderUserId)).emit(SOCKET_EVENTS.JOB_NEW_OFFER, payload);
}

/**
 * Dispatches order lifecycle status changes to the customer.
 */
export function emitOrderStatusToCustomer(customerUserId: string, payload: unknown): void {
  const io = getIO();
  io.to(getCustomerRoom(customerUserId)).emit(SOCKET_EVENTS.ORDER_STATUS_UPDATE, payload);
}

/**
 * Broadcasts in-app chat message to order and tracking rooms.
 */
export function emitChatMessageToOrder(orderId: string, trackingCode: string, payload: unknown): void {
  try {
    const io = getIO();
    io.to(getOrderRoom(orderId)).emit(SOCKET_EVENTS.CHAT_MESSAGE_RECEIVED, payload);
    io.to(getTrackingRoom(trackingCode)).emit(SOCKET_EVENTS.CHAT_MESSAGE_RECEIVED, payload);
  } catch {
    // Non-fatal if gateway not active
  }
}

/**
 * Broadcasts emergency SOS alerts to dispatch ops room.
 */
export function emitEmergencySosAlert(payload: unknown): void {
  try {
    const io = getIO();
    io.to(getEmergencySosRoom()).emit(SOCKET_EVENTS.RIDER_EMERGENCY_SOS, payload);
    io.to(getAdminFleetRoom()).emit(SOCKET_EVENTS.RIDER_EMERGENCY_SOS, payload);
  } catch {
    // Non-fatal if gateway not active
  }
}

/**
 * Cleanly shuts down the socket gateway and closes Redis pub/sub connections (for testing and teardown).
 */
export async function closeSocketGateway(): Promise<void> {
  if (ioInstance) {
    await new Promise<void>((resolve) => {
      ioInstance!.close(() => resolve());
    });
    ioInstance = null;
  }

  if (pubClientInstance) {
    await pubClientInstance.quit();
    pubClientInstance = null;
  }

  if (subClientInstance) {
    await subClientInstance.quit();
    subClientInstance = null;
  }
}

