import { z } from 'zod';
import { normalizeNigerianPhone } from './validation';
import { OrderPickupInputSchema } from './order';
import { KoboAmountSchema } from './currency';

/**
 * Validates and normalizes Nigerian phone numbers inside Vendor CSV uploads.
 */
export const VendorPhoneInputSchema = z.string().transform((val, ctx) => {
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
 * Schema for an individual validated row in a vendor bulk dispatch CSV.
 */
export const VendorCsvRowSchema = z.object({
  batchGroupKey: z.string().min(1, 'Batch group key is required').max(40).default('RUN-1'),
  recipientName: z.string().min(2, 'Recipient name is required (min 2 chars)').max(100),
  recipientPhone: VendorPhoneInputSchema,
  dropoffAddress: z.string().min(5, 'Dropoff address is required (min 5 chars)').max(250),
  dropoffLandmark: z
    .string()
    .min(3, 'Mandatory Nigerian landmark is required for street delivery (min 3 chars)')
    .max(200),
  packageDescription: z.string().min(2, 'Package description is required').max(200),
  packageSize: z.enum(['small', 'medium', 'large']).default('medium'),
  lat: z.number().min(4).max(14).optional(),
  lng: z.number().min(2).max(15).optional(),
});
export type VendorCsvRow = z.infer<typeof VendorCsvRowSchema>;

/**
 * Vendor Bulk Fare Estimate Request.
 */
export const VendorBatchEstimateRequestSchema = z.object({
  pickup: OrderPickupInputSchema,
  rows: z.array(VendorCsvRowSchema).min(1, 'At least 1 order row is required').max(50, 'Max 50 rows per batch'),
});
export type VendorBatchEstimateRequest = z.infer<typeof VendorBatchEstimateRequestSchema>;

/**
 * Vendor Bulk Order Creation & Escrow Lock Request.
 */
export const VendorBatchCreateRequestSchema = z.object({
  pickup: OrderPickupInputSchema,
  rows: z.array(VendorCsvRowSchema).min(1, 'At least 1 order row is required').max(50, 'Max 50 rows per batch'),
  paymentMethod: z.enum(['wallet', 'pay_on_pickup']).default('wallet'),
});
export type VendorBatchCreateRequest = z.infer<typeof VendorBatchCreateRequestSchema>;

/**
 * Individual motorcycle run in a batch summary.
 */
export const VendorBatchRunItemSchema = z.object({
  batchGroupKey: z.string(),
  stopsCount: z.number().int().positive(),
  estimatedFareKobo: KoboAmountSchema,
  totalDistanceKm: z.number(),
  estimatedDurationMinutes: z.number(),
  stops: z.array(VendorCsvRowSchema).optional(),
  orderId: z.string().optional(),
  trackingCode: z.string().optional(),
});
export type VendorBatchRunItem = z.infer<typeof VendorBatchRunItemSchema>;

/**
 * Summary response for batch fare calculation and bulk order creation.
 */
export const VendorBatchSummaryResponseSchema = z.object({
  totalRunsCount: z.number().int().positive(),
  totalStopsCount: z.number().int().positive(),
  grandTotalFareKobo: KoboAmountSchema,
  runs: z.array(VendorBatchRunItemSchema),
});
export type VendorBatchSummaryResponse = z.infer<typeof VendorBatchSummaryResponseSchema>;

