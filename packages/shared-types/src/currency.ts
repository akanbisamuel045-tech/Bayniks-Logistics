import { z } from 'zod';

/**
 * Converts Nigerian Naira (float or integer) to safe integer Kobo.
 * Prevents floating-point drift (e.g., 19.99 * 100 = 1998.9999999999998 -> 1999).
 * Golden Rule 6: All financial transactions must use integer Kobo.
 */
export function nairaToKobo(naira: number): number {
  if (!Number.isFinite(naira)) {
    throw new TypeError('Naira amount must be a finite number');
  }
  return Math.round(naira * 100);
}

/**
 * Converts integer Kobo to decimal Naira.
 */
export function koboToNaira(kobo: number): number {
  if (!Number.isFinite(kobo)) {
    throw new TypeError('Kobo amount must be a finite number');
  }
  return Math.round(kobo) / 100;
}

/**
 * Formats integer Kobo into display Naira currency string (e.g., 150000 -> ₦1,500.00).
 */
export function formatNaira(kobo: number): string {
  const naira = koboToNaira(kobo);
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(naira);
}

export const KoboAmountSchema = z.number().int().nonnegative('Amount in kobo must be a non-negative integer');
