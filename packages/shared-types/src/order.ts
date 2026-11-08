import { z } from 'zod';
import { VehicleTypeSchema, PaymentMethodSchema, OrderStatusSchema, OrderStopStatusSchema } from './enums';
import { LatLngSchema } from './geo';
import { normalizeNigerianPhone } from './validation';
import { LiveTelemetrySchema } from './socket';

/**
 * Validates and normalizes Nigerian phone number inside order forms.
 */
export const OrderPhoneNumberSchema = z.string().transform((val, ctx) => {
  try {
    return normalizeNigerianPhone(val);
  } catch (err: any) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: err.message || 'Invalid Nigerian phone number format',
    });
    return z.NEVER;
  }
});

/**
 * Input schema for a single drop-off stop when creating an order.
 */
export const OrderStopCreateInputSchema = z.object({
  recipientName: z.string().min(2, 'Recipient name is required (min 2 chars)').max(100),
  recipientPhone: OrderPhoneNumberSchema,
  dropoffAddress: z.string().min(3, 'Dropoff address is required (min 3 chars)'),
  dropoffLandmark: z
    .string()
    .min(2, 'Landmark is required for Nigerian street navigation (min 2 chars)')
    .max(150),
  dropoffLocation: LatLngSchema,
  packageDescription: z
    .string()
    .min(2, 'Package description is required (min 2 chars)')
    .max(200),
});
export type OrderStopCreateInput = z.infer<typeof OrderStopCreateInputSchema>;

/**
 * Input schema for creating a new order (pickup + 1 to 10 stops).
 */
export const CreateOrderRequestSchema = z.object({
  vehicleType: VehicleTypeSchema.default('bike'),
  paymentMethod: PaymentMethodSchema,
  pickup: z.object({
    address: z.string().min(3, 'Pickup address is required (min 3 chars)'),
    landmark: z
      .string()
      .min(2, 'Pickup landmark is required for Nigerian street navigation')
      .max(150),
    location: LatLngSchema,
    contactName: z.string().min(2, 'Contact name is required').max(100),
    contactPhone: OrderPhoneNumberSchema,
  }),
  stops: z
    .array(OrderStopCreateInputSchema)
    .min(1, 'At least 1 delivery stop is required')
    .max(10, 'Maximum 10 delivery stops allowed'),
});
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

/**
 * Public tracking stop schema (redacts deliveryPin for unauthenticated viewers).
 */
export const PublicOrderStopSchema = z.object({
  _id: z.string().optional(),
  sequenceNumber: z.number(),
  recipientName: z.string(),
  dropoffAddress: z.string(),
  dropoffLandmark: z.string(),
  dropoffLocation: LatLngSchema,
  packageDescription: z.string(),
  status: OrderStopStatusSchema,
  deliveredAt: z.string().optional(),
});
export type PublicOrderStop = z.infer<typeof PublicOrderStopSchema>;

/**
 * Sanitized assigned rider summary returned for public customer/recipient tracking.
 */
export const AssignedRiderSummarySchema = z.object({
  fullName: z.string(),
  phone: z.string(),
  vehicleType: VehicleTypeSchema,
  plateNumber: z.string(),
  rating: z.number(),
});
export type AssignedRiderSummary = z.infer<typeof AssignedRiderSummarySchema>;

/**
 * Public tracking summary response schema (redacts pickupPin and deliveryPins).
 */
export const PublicTrackingResponseSchema = z.object({
  trackingCode: z.string(),
  status: OrderStatusSchema,
  vehicleType: VehicleTypeSchema,
  estimatedDistanceKm: z.number(),
  totalFareKobo: z.number(),
  riderId: z.string().optional(),
  assignedRider: AssignedRiderSummarySchema.optional(),
  liveTelemetry: LiveTelemetrySchema.optional(),
  pickup: z.object({
    address: z.string(),
    landmark: z.string(),
    location: LatLngSchema,
    contactName: z.string(),
  }),
  stops: z.array(PublicOrderStopSchema),
  encodedRoutePolyline: z.string().optional(),
  createdAt: z.string(),
});
export type PublicTrackingResponse = z.infer<typeof PublicTrackingResponseSchema>;

