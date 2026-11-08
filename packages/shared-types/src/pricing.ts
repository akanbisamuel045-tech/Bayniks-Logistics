import { z } from 'zod';
import { VehicleTypeSchema } from './enums';
import { LatLngSchema } from './geo';
import { KoboAmountSchema } from './currency';

/**
 * Autocomplete address prediction schema.
 * Represents a suggested place/address in Nigerian cities.
 */
export const PlacePredictionSchema = z.object({
  placeId: z.string(),
  description: z.string(),
  mainText: z.string(),
  secondaryText: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
export type PlacePrediction = z.infer<typeof PlacePredictionSchema>;

/**
 * Route stop input schema for pickup or drop-off stops.
 */
export const RouteStopInputSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  landmark: z.string().optional(),
  location: LatLngSchema,
});
export type RouteStopInput = z.infer<typeof RouteStopInputSchema>;

/**
 * Fare estimate request schema.
 * Validates dynamic fare calculation across 1 to 10 delivery stops.
 */
export const FareEstimateRequestSchema = z.object({
  vehicleType: VehicleTypeSchema.default('bike'),
  pickup: RouteStopInputSchema,
  stops: z.array(RouteStopInputSchema).min(1, 'At least 1 delivery stop is required').max(10, 'Maximum 10 delivery stops allowed'),
  surgeMultiplier: z.number().min(1).optional(),
});
export type FareEstimateRequest = z.infer<typeof FareEstimateRequestSchema>;

/**
 * Breakdown of computed fare and metrics.
 * Guaranteed: platformCommissionKobo + riderEarningKobo === totalFareKobo.
 */
export const FareEstimateResponseSchema = z.object({
  vehicleType: VehicleTypeSchema,
  estimatedDistanceKm: z.number().nonnegative(),
  estimatedDurationMinutes: z.number().nonnegative(),
  baseFareKobo: KoboAmountSchema,
  distanceFareKobo: KoboAmountSchema,
  durationTrafficFareKobo: KoboAmountSchema,
  multiStopSurchargeKobo: KoboAmountSchema,
  surgeMultiplier: z.number().min(1),
  totalFareKobo: KoboAmountSchema,
  platformCommissionKobo: KoboAmountSchema,
  riderEarningKobo: KoboAmountSchema,
  encodedPolyline: z.string(),
  cached: z.boolean().optional(),
});
export type FareEstimateResponse = z.infer<typeof FareEstimateResponseSchema>;

/**
 * Vehicle pricing rates in integer Kobo.
 */
export interface VehicleRateCard {
  baseFareKobo: number;
  perKmKobo: number;
  perMinuteKobo: number;
  extraStopSurchargeKobo: number;
  minimumFareKobo: number;
}

export const NIGERIAN_RATE_CARDS: Record<z.infer<typeof VehicleTypeSchema>, VehicleRateCard> = {
  bike: {
    baseFareKobo: 150000,       // ₦1,500.00
    perKmKobo: 25000,           // ₦250.00 / km
    perMinuteKobo: 3000,        // ₦30.00 / min
    extraStopSurchargeKobo: 50000, // ₦500.00 per extra stop
    minimumFareKobo: 250000,    // ₦2,500.00 floor
  },
  van: {
    baseFareKobo: 500000,       // ₦5,000.00
    perKmKobo: 60000,           // ₦600.00 / km
    perMinuteKobo: 7500,        // ₦75.00 / min
    extraStopSurchargeKobo: 120000, // ₦1,200.00 per extra stop
    minimumFareKobo: 800000,    // ₦8,000.00 floor
  },
  truck: {
    baseFareKobo: 1500000,      // ₦15,000.00
    perKmKobo: 120000,          // ₦1,200.00 / km
    perMinuteKobo: 15000,       // ₦150.00 / min
    extraStopSurchargeKobo: 250000, // ₦2,500.00 per extra stop
    minimumFareKobo: 2000000,   // ₦20,000.00 floor
  },
};

