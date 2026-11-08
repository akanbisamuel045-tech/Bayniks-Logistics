import { z } from 'zod';
import { OrderStatusSchema } from './enums';
import { TrackingCodeSchema } from './validation';

export const SOCKET_EVENTS = {
  RIDER_LOCATION_PING: 'rider:location_ping',
  TRACKING_UPDATE: 'tracking:update',
  JOB_NEW_OFFER: 'job:new_offer',
  JOB_RESPOND_OFFER: 'job:respond_offer',
  TRACK_SUBSCRIBE: 'track:subscribe',
  TRACK_UNSUBSCRIBE: 'track:unsubscribe',
  TRACK_SNAPSHOT: 'tracking:snapshot',
  ROOM_JOIN_PRIVATE: 'room:join_private',
  ORDER_STATUS_UPDATE: 'order:status_update',
} as const;

/**
 * Rider -> Server live GPS ping sent every 5 seconds.
 * Buffered strictly in Redis (Golden Rule 5).
 */
export const RiderLocationPingSchema = z.object({
  orderId: z.string().optional(),
  trackingCode: TrackingCodeSchema.optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  bearing: z.number().min(0).max(360),
  speed: z.number().min(0), // km/h
  accuracy: z.number().min(0), // meters
  batteryLevel: z.number().min(0).max(100).optional(),
  isMockLocation: z.boolean().optional(),
  timestamp: z.number().int().positive(),
});
export type RiderLocationPing = z.infer<typeof RiderLocationPingSchema>;

/**
 * Result returned after evaluating and buffering a rider telemetry ping.
 */
export const TelemetryIngestResultSchema = z.object({
  accepted: z.boolean(),
  reason: z.string().optional(),
  broadcastedToRoom: z.string().optional(),
  updatedAt: z.number(),
});
export type TelemetryIngestResult = z.infer<typeof TelemetryIngestResultSchema>;

/**
 * Batch telemetry submission for 3G offline-sync fallback.
 */
export const BatchTelemetryPingSchema = z.object({
  pings: z.array(RiderLocationPingSchema).min(1).max(100),
});
export type BatchTelemetryPing = z.infer<typeof BatchTelemetryPingSchema>;

/**
 * Snapshot of live rider coordinates stored in Redis Hash `rider:telemetry:<riderId>`.
 */
export const LiveTelemetrySchema = z.object({
  lat: z.number(),
  lng: z.number(),
  bearing: z.number(),
  speed: z.number(),
  accuracy: z.number().optional(),
  batteryLevel: z.number().optional(),
  activeOrderId: z.string().optional(),
  trackingCode: z.string().optional(),
  updatedAt: z.number(),
});
export type LiveTelemetry = z.infer<typeof LiveTelemetrySchema>;

/**
 * Server -> Room track:<tracking_code> live tracking update for customer & recipient web view.
 */
export const TrackingUpdateSchema = z.object({
  trackingCode: TrackingCodeSchema,
  riderId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  bearing: z.number().min(0).max(360),
  speed: z.number().min(0),
  status: OrderStatusSchema,
  etaMinutes: z.number().min(0).optional(),
  updatedAt: z.number().int().positive(),
});
export type TrackingUpdate = z.infer<typeof TrackingUpdateSchema>;

/**
 * Server -> Room rider:<rider_id> job offer dispatch ping with 30s countdown.
 */
export const JobNewOfferSchema = z.object({
  orderId: z.string().min(1),
  trackingCode: TrackingCodeSchema,
  pickupAddress: z.string().min(1),
  pickupLandmark: z.string().optional(),
  estimatedDistanceKm: z.number().positive(),
  riderEarningKobo: z.number().int().nonnegative(),
  stopsCount: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
});
export type JobNewOffer = z.infer<typeof JobNewOfferSchema>;

/**
 * Subscription payload for public/customer live tracking.
 */
export const TrackSubscribePayloadSchema = z.object({
  trackingCode: TrackingCodeSchema,
});
export type TrackSubscribePayload = z.infer<typeof TrackSubscribePayloadSchema>;

/**
 * Standard socket acknowledgment response.
 */
export const SocketAckResponseSchema = z.object({
  ok: z.boolean(),
  room: z.string().optional(),
  error: z.string().optional(),
  code: z.string().optional(),
});
export type SocketAckResponse = z.infer<typeof SocketAckResponseSchema>;

/**
 * Deterministic socket room naming helpers.
 */
export function getRiderRoom(riderUserId: string): string {
  return `rider:${riderUserId}`;
}

export function getCustomerRoom(customerUserId: string): string {
  return `customer:${customerUserId}`;
}

export function getVendorRoom(vendorUserId: string): string {
  return `vendor:${vendorUserId}`;
}

export function getTrackingRoom(trackingCode: string): string {
  return `track:${trackingCode.toUpperCase()}`;
}

export function getAdminFleetRoom(): string {
  return 'admin:fleet';
}
