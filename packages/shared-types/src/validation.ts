import { z } from 'zod';

/**
 * 4-digit numeric PIN for pickup verification and drop-off proof of delivery.
 */
export const FourDigitPinSchema = z
  .string()
  .regex(/^\d{4}$/, 'PIN must be exactly 4 numeric digits');
export type FourDigitPin = z.infer<typeof FourDigitPinSchema>;

/**
 * Unique order tracking code format: e.g. LGS-849201 (3 uppercase letters, hyphen, 6 digits).
 */
export const TrackingCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}-\d{6}$/, 'Tracking code must match format ABC-123456 (e.g., LGS-849201)');
export type TrackingCode = z.infer<typeof TrackingCodeSchema>;

/**
 * Nigerian phone number normalized to E.164 format (+234...).
 */
export const NigerianPhoneSchema = z
  .string()
  .regex(/^\+234\d{10}$/, 'Phone number must be in E.164 Nigerian format (+2348012345678)');
export type NigerianPhone = z.infer<typeof NigerianPhoneSchema>;

/**
 * Normalizes common Nigerian phone formats (080..., 23480..., +23480...) to strict E.164 (+23480...).
 */
export function normalizeNigerianPhone(input: string): string {
  const cleaned = input.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+234') && cleaned.length === 14) {
    return cleaned;
  }
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `+234${cleaned.slice(1)}`;
  }
  throw new Error(`Invalid Nigerian phone number format: ${input}`);
}
