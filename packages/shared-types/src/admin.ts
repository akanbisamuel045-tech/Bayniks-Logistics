import { z } from 'zod';
import { NigerianPhoneSchema } from './validation';

/**
 * Individual motorcycle telemetry state for Super-Admin "God's Eye" live fleet radar.
 */
export const FleetBikeTelemetryItemSchema = z.object({
  riderUserId: z.string(),
  fullName: z.string(),
  phone: NigerianPhoneSchema,
  plateNumber: z.string(),
  status: z.enum(['offline', 'available', 'busy']),
  kycStatus: z.enum(['pending', 'pending_review', 'approved', 'rejected']),
  fleetOwnerId: z.string().nullable().optional(),
  lat: z.number(),
  lng: z.number(),
  bearing: z.number().default(0),
  speed: z.number().default(0),
  isMockLocation: z.boolean().default(false),
  activeOrderId: z.string().nullable().optional(),
  activeTrackingCode: z.string().nullable().optional(),
  updatedAt: z.number(),
});
export type FleetBikeTelemetryItem = z.infer<typeof FleetBikeTelemetryItemSchema>;

/**
 * Request payload for mid-trip emergency order reassignment by an Admin.
 */
export const AdminReassignOrderRequestSchema = z.object({
  newRiderUserId: z.string().min(1, 'New rider user ID is required'),
  reason: z
    .string()
    .min(3, 'Reassignment reason must be at least 3 characters')
    .max(250)
    .default('Motorcycle breakdown / emergency reassignment'),
});
export type AdminReassignOrderRequest = z.infer<typeof AdminReassignOrderRequestSchema>;

/**
 * Aggregated live fleet overview for Super-Admin and Fleet Owners.
 */
export const AdminFleetOverviewResponseSchema = z.object({
  onlineCount: z.number().int().nonnegative(),
  busyCount: z.number().int().nonnegative(),
  mockLocationFlaggedCount: z.number().int().nonnegative(),
  pendingKycCount: z.number().int().nonnegative(),
  bikes: z.array(FleetBikeTelemetryItemSchema),
});
export type AdminFleetOverviewResponse = z.infer<typeof AdminFleetOverviewResponseSchema>;

/**
 * Schema for reviewing rider KYC documentation.
 */
export const AdminReviewKycRequestSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().max(250).optional(),
});
export type AdminReviewKycRequest = z.infer<typeof AdminReviewKycRequestSchema>;
