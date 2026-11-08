import { z } from 'zod';
import { VehicleTypeSchema, KycStatusSchema, RiderStatusSchema } from './enums';

/**
 * Standard Nigerian vehicle license plate number format (e.g., KJA-101-AA, LSD-432-XY).
 */
export const NigerianPlateNumberSchema = z
  .string()
  .trim()
  .transform((val) => val.toUpperCase())
  .refine(
    (val) => /^[A-Z]{3}-\d{3}-[A-Z]{2}$/.test(val),
    'Plate number must match standard Nigerian format ABC-123-DE (e.g., KJA-101-AA)'
  );
export type NigerianPlateNumber = z.infer<typeof NigerianPlateNumberSchema>;

/**
 * Rider KYC and vehicle onboarding payload.
 */
export const RiderOnboardingSchema = z.object({
  vehicleType: VehicleTypeSchema,
  plateNumber: NigerianPlateNumberSchema,
  ridersCardNumber: z
    .string()
    .trim()
    .min(5, 'Riders card number must be at least 5 characters')
    .max(30, 'Riders card number must not exceed 30 characters'),
  ridersCardDocumentUrl: z.string().url('Valid riders card document URL is required'),
  vehiclePhotoUrl: z.string().url('Vehicle photo must be a valid URL').optional(),
  fleetInviteCodeOrPhone: z.string().trim().optional(),
});
export type RiderOnboarding = z.infer<typeof RiderOnboardingSchema>;

/**
 * Rider availability status toggle payload.
 * When going available, GPS coordinates are mandatory.
 */
export const RiderStatusToggleSchema = z.object({
  status: z.enum(['offline', 'available']),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type RiderStatusToggle = z.infer<typeof RiderStatusToggleSchema>;

export const AdminKycReviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().trim().optional(),
});
export type AdminKycReview = z.infer<typeof AdminKycReviewSchema>;

export { KycStatusSchema, RiderStatusSchema };

