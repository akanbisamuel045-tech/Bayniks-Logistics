import crypto from 'crypto';
import {
  FareEstimateRequest,
  FareEstimateResponse,
  NIGERIAN_RATE_CARDS,
  VehicleType,
} from '@logistics/shared-types';
import { getRedisClient } from '../config/redis';
import { getMapsProvider, IMapsProvider } from '../providers/maps.provider';

export class PricingService {
  private mapsProvider: IMapsProvider;

  constructor(mapsProvider: IMapsProvider = getMapsProvider()) {
    this.mapsProvider = mapsProvider;
  }

  /**
   * Generates a deterministic cache key for a route & fare estimate request.
   */
  private generateCacheKey(request: FareEstimateRequest): string {
    const payload = {
      vehicleType: request.vehicleType,
      pickup: {
        lat: Number(request.pickup.location.lat.toFixed(5)),
        lng: Number(request.pickup.location.lng.toFixed(5)),
      },
      stops: request.stops.map((s) => ({
        lat: Number(s.location.lat.toFixed(5)),
        lng: Number(s.location.lng.toFixed(5)),
      })),
      surgeMultiplier: request.surgeMultiplier ? Number(request.surgeMultiplier.toFixed(2)) : 1.0,
    };

    const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    return `pricing:estimate:${hash}`;
  }

  /**
   * Calculates dynamic multi-stop fare with Nigerian rate card and Redis caching.
   */
  async calculateEstimate(request: FareEstimateRequest): Promise<FareEstimateResponse> {
    const cacheKey = this.generateCacheKey(request);
    const redis = getRedisClient();

    // 1. Check Redis Cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed: FareEstimateResponse = JSON.parse(cached);
        return {
          ...parsed,
          cached: true,
        };
      }
    } catch (err) {
      // Non-fatal if Redis read fails; proceed to compute fresh estimate
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[PricingService] Redis cache lookup failed:', err);
      }
    }

    // 2. Compute Route via Maps Provider
    const pickupLoc = request.pickup.location;
    const stopLocs = request.stops.map((s) => s.location);
    const route = await this.mapsProvider.calculateRoute(pickupLoc, stopLocs);

    // 3. Apply Nigerian Logistics Rate Card
    const vehicleType: VehicleType = request.vehicleType;
    const rateCard = NIGERIAN_RATE_CARDS[vehicleType];
    const surgeMultiplier = Math.max(1, request.surgeMultiplier ?? 1.0);

    const baseFareKobo = rateCard.baseFareKobo;
    const distanceFareKobo = Math.round(route.distanceKm * rateCard.perKmKobo);
    const durationTrafficFareKobo = Math.round(route.durationMinutes * rateCard.perMinuteKobo);

    // Extra stops surcharge: only for stops beyond the 1st drop-off stop
    const extraStopsCount = Math.max(0, request.stops.length - 1);
    const multiStopSurchargeKobo = extraStopsCount * rateCard.extraStopSurchargeKobo;

    // Subtotal before surge
    const subtotalKobo =
      baseFareKobo + distanceFareKobo + durationTrafficFareKobo + multiStopSurchargeKobo;

    // Apply surge multiplier
    const surgedSubtotalKobo = Math.round(subtotalKobo * surgeMultiplier);

    // Apply minimum fare floor
    const flooredKobo = Math.max(surgedSubtotalKobo, rateCard.minimumFareKobo);

    // Financial Rounding: Round to nearest ₦50 (5,000 kobo)
    const roundedKobo = Math.round(flooredKobo / 5000) * 5000;
    const totalFareKobo = Math.max(roundedKobo, rateCard.minimumFareKobo);

    // Golden Rule 6: 20% platform commission + 80% rider earning reconciled with ZERO float drift
    const platformCommissionKobo = Math.round(totalFareKobo * 0.2);
    const riderEarningKobo = totalFareKobo - platformCommissionKobo;

    const response: FareEstimateResponse = {
      vehicleType,
      estimatedDistanceKm: route.distanceKm,
      estimatedDurationMinutes: route.durationMinutes,
      baseFareKobo,
      distanceFareKobo,
      durationTrafficFareKobo,
      multiStopSurchargeKobo,
      surgeMultiplier,
      totalFareKobo,
      platformCommissionKobo,
      riderEarningKobo,
      encodedPolyline: route.encodedPolyline,
      cached: false,
    };

    // 4. Cache in Redis with 300s TTL (5 minutes)
    try {
      await redis.setex(cacheKey, 300, JSON.stringify(response));
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[PricingService] Redis cache store failed:', err);
      }
    }

    return response;
  }
}

let pricingServiceInstance: PricingService | null = null;

export function getPricingService(): PricingService {
  if (!pricingServiceInstance) {
    pricingServiceInstance = new PricingService();
  }
  return pricingServiceInstance;
}

