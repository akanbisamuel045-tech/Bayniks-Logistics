import { z } from 'zod';
import { FourDigitPinSchema } from './validation';

/**
 * Rider response to a job offer (accept or decline).
 */
export const DispatchOfferRespondSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  action: z.enum(['accept', 'decline']),
});
export type DispatchOfferRespond = z.infer<typeof DispatchOfferRespondSchema>;

/**
 * Result returned by the geospatial dispatch engine when matching riders.
 */
export const DispatchMatchResultSchema = z.object({
  matched: z.boolean(),
  orderId: z.string(),
  trackingCode: z.string(),
  offeredRiderIds: z.array(z.string()),
  radiusMetersUsed: z.number(),
  expiresAt: z.number().optional(),
  reason: z.string().optional(),
});
export type DispatchMatchResult = z.infer<typeof DispatchMatchResultSchema>;

/**
 * Order status transition updates triggered by dispatch riders during delivery.
 */
export const OrderStatusTransitionSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  status: z.enum(['arrived_pickup', 'in_transit', 'arrived_dropoff']),
  stopSequenceNumber: z.number().int().positive().optional(),
  pickupPin: z.string().optional(),
});
export type OrderStatusTransition = z.infer<typeof OrderStatusTransitionSchema>;

/**
 * Verification request for 4-digit pickup PIN provided by sender.
 */
export const VerifyPickupPinRequestSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  pickupPin: FourDigitPinSchema,
});
export type VerifyPickupPinRequest = z.infer<typeof VerifyPickupPinRequestSchema>;

/**
 * Verification request for stop delivery PIN and client-compressed photo POD.
 */
export const VerifyStopDeliveryRequestSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  stopSequenceNumber: z.number().int().min(1).max(10),
  deliveryPin: FourDigitPinSchema,
  proofOfDeliveryBase64OrUrl: z.string().min(10, 'Proof of delivery image data is required'),
  byteSize: z
    .number()
    .int()
    .positive()
    .max(307200, 'POD image must be compressed below 300KB (307,200 bytes) for 3G networks')
    .optional(),
});
export type VerifyStopDeliveryRequest = z.infer<typeof VerifyStopDeliveryRequestSchema>;
