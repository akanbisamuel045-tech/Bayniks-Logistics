import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { getRedisClient, closeRedis } from '../config/redis';
import {
  FareEstimateRequest,
  FareEstimateResponseSchema,
  PlacePredictionSchema,
  NIGERIAN_RATE_CARDS,
  VehicleType,
} from '@logistics/shared-types';
import { encodePolyline, decodePolyline } from '../providers/maps.provider';

const app = createApp();

describe('Stage 5: Geospatial Address Autocomplete & Dynamic Multi-Stop Fare Engine', () => {
  beforeAll(async () => {
    const redis = getRedisClient();
    // Clear pricing cache keys before tests
    const keys = await redis.keys('pricing:estimate:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  afterAll(async () => {
    const redis = getRedisClient();
    const keys = await redis.keys('pricing:estimate:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    await closeRedis();
  });

  // SUITE 1: Autocomplete returns Nigerian landmarks
  describe('Suite 1: Nigerian Autocomplete & Polyline Encoding', () => {
    it('should return matching Lagos landmarks when queried for "Ikeja"', async () => {
      const res = await request(app)
        .get('/api/v1/maps/autocomplete')
        .query({ q: 'Ikeja' });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      for (const item of res.body) {
        const parsed = PlacePredictionSchema.safeParse(item);
        expect(parsed.success).toBe(true);
        expect(
          item.description.toLowerCase().includes('ikeja') ||
          item.mainText.toLowerCase().includes('ikeja') ||
          item.secondaryText.toLowerCase().includes('ikeja')
        ).toBe(true);
      }
    });

    it('should return Lekki landmarks when queried for "Lekki"', async () => {
      const res = await request(app)
        .get('/api/v1/maps/autocomplete')
        .query({ q: 'Lekki' });

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);

      const hasAdmiraltyOrToll = res.body.some(
        (p: any) =>
          p.mainText.includes('Admiralty') ||
          p.mainText.includes('Toll Gate') ||
          p.mainText.includes('Chevron')
      );
      expect(hasAdmiraltyOrToll).toBe(true);
    });

    it('should return default popular landmarks when query is empty', async () => {
      const res = await request(app).get('/api/v1/maps/autocomplete');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should encode and decode Google Polyline coordinates bidirectionally', () => {
      const testCoordinates = [
        { lat: 6.5933, lng: 3.3421 },
        { lat: 6.5186, lng: 3.3712 },
        { lat: 6.4281, lng: 3.4219 },
      ];

      const encoded = encodePolyline(testCoordinates);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);

      const decoded = decodePolyline(encoded);
      expect(decoded.length).toBe(testCoordinates.length);

      for (let i = 0; i < testCoordinates.length; i++) {
        expect(decoded[i]!.lat).toBeCloseTo(testCoordinates[i]!.lat, 4);
        expect(decoded[i]!.lng).toBeCloseTo(testCoordinates[i]!.lng, 4);
      }
    });
  });

  // SUITE 2: Single-stop vs cross-town fare calculations respect minimum floor & polyline
  describe('Suite 2: Single-Stop vs Cross-Town Fares & Minimum Fare Floor', () => {
    it('should enforce vehicle minimum fare floor on short trips', async () => {
      // Short trip: Computer Village to Allen Avenue (~1.5 km)
      const shortTripPayload: FareEstimateRequest = {
        vehicleType: 'bike',
        pickup: {
          address: 'Computer Village, Ikeja',
          landmark: 'Otigba Street',
          location: { lat: 6.5933, lng: 3.3421 },
        },
        stops: [
          {
            address: 'Allen Avenue, Ikeja',
            location: { lat: 6.6018, lng: 3.3515 },
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/pricing/estimate')
        .send(shortTripPayload);

      expect(res.status).toBe(200);
      const parsed = FareEstimateResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);

      const data = res.body;
      expect(data.vehicleType).toBe('bike');
      expect(data.estimatedDistanceKm).toBeGreaterThan(0);
      expect(data.estimatedDistanceKm).toBeLessThan(5);

      // Bike minimum fare is ₦2,500 (250,000 kobo)
      expect(data.totalFareKobo).toBeGreaterThanOrEqual(NIGERIAN_RATE_CARDS.bike.minimumFareKobo);
      expect(data.totalFareKobo).toBe(250000);

      // Verify polyline exists and decodes
      expect(typeof data.encodedPolyline).toBe('string');
      const decoded = decodePolyline(data.encodedPolyline);
      expect(decoded.length).toBeGreaterThanOrEqual(2);
    });

    it('should calculate higher fare for cross-town trip (Ikeja to Victoria Island)', async () => {
      const crossTownPayload: FareEstimateRequest = {
        vehicleType: 'bike',
        pickup: {
          address: 'Computer Village, Ikeja',
          location: { lat: 6.5933, lng: 3.3421 },
        },
        stops: [
          {
            address: 'Adetokunbo Ademola Street, Victoria Island',
            location: { lat: 6.4281, lng: 3.4219 },
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/pricing/estimate')
        .send(crossTownPayload);

      expect(res.status).toBe(200);
      const data = res.body;

      // Distance should reflect ~20-30 km with 1.32 winding factor
      expect(data.estimatedDistanceKm).toBeGreaterThan(15);
      // Total fare should exceed minimum fare due to distance and duration
      expect(data.totalFareKobo).toBeGreaterThan(NIGERIAN_RATE_CARDS.bike.minimumFareKobo);
      expect(data.distanceFareKobo).toBeGreaterThan(0);
      expect(data.durationTrafficFareKobo).toBeGreaterThan(0);
    });
  });

  // SUITE 3: Multi-stop cumulative distance & extra stop surcharges
  describe('Suite 3: Multi-Stop Routing & Extra Stop Surcharges', () => {
    it('should charge extra stop surcharge for 3 delivery stops (2 extra stops)', async () => {
      const multiStopPayload: FareEstimateRequest = {
        vehicleType: 'bike',
        pickup: {
          address: 'Ikeja City Mall',
          location: { lat: 6.6198, lng: 3.3587 },
        },
        stops: [
          {
            address: 'Stop 1: Yaba Tech',
            location: { lat: 6.5186, lng: 3.3712 },
          },
          {
            address: 'Stop 2: National Stadium, Surulere',
            location: { lat: 6.4969, lng: 3.3615 },
          },
          {
            address: 'Stop 3: Admiralty Way, Lekki',
            location: { lat: 6.4474, lng: 3.4723 },
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/pricing/estimate')
        .send(multiStopPayload);

      expect(res.status).toBe(200);
      const data = res.body;

      // 3 delivery stops -> 2 extra stops beyond the first
      // Bike extra stop surcharge = ₦500 (50,000 kobo) per extra stop
      const expectedSurcharge = 2 * NIGERIAN_RATE_CARDS.bike.extraStopSurchargeKobo;
      expect(data.multiStopSurchargeKobo).toBe(expectedSurcharge);
      expect(data.multiStopSurchargeKobo).toBe(100000);
    });

    it('should correctly calculate van extra stop surcharge for 4 delivery stops', async () => {
      const vanMultiStopPayload: FareEstimateRequest = {
        vehicleType: 'van',
        pickup: {
          address: 'Oshodi Interchange',
          location: { lat: 6.5569, lng: 3.3524 },
        },
        stops: [
          { address: 'Stop 1', location: { lat: 6.5721, lng: 3.3683 } },
          { address: 'Stop 2', location: { lat: 6.5186, lng: 3.3712 } },
          { address: 'Stop 3', location: { lat: 6.4531, lng: 3.3882 } },
          { address: 'Stop 4', location: { lat: 6.4281, lng: 3.4219 } },
        ],
      };

      const res = await request(app)
        .post('/api/v1/pricing/estimate')
        .send(vanMultiStopPayload);

      expect(res.status).toBe(200);
      const data = res.body;

      // 4 delivery stops -> 3 extra stops
      // Van extra stop surcharge = ₦1,200 (120,000 kobo) per extra stop
      const expectedSurcharge = 3 * NIGERIAN_RATE_CARDS.van.extraStopSurchargeKobo;
      expect(data.multiStopSurchargeKobo).toBe(expectedSurcharge);
      expect(data.multiStopSurchargeKobo).toBe(360000);
      expect(data.totalFareKobo).toBeGreaterThanOrEqual(NIGERIAN_RATE_CARDS.van.minimumFareKobo);
    });
  });

  // SUITE 4: Exact Integer Kobo reconciliation: platformCommissionKobo + riderEarningKobo === totalFareKobo
  describe('Suite 4: Financial Integer Kobo Precision & Exact Reconciliation', () => {
    const testVehicles: VehicleType[] = ['bike', 'van', 'truck'];
    const testSurges = [1.0, 1.25, 1.5, 2.0];

    for (const vehicleType of testVehicles) {
      for (const surge of testSurges) {
        it(`reconciles integer kobo for ${vehicleType} with surge multiplier ${surge}`, async () => {
          const payload: FareEstimateRequest = {
            vehicleType,
            pickup: {
              address: 'Maryland Mall',
              location: { lat: 6.5721, lng: 3.3683 },
            },
            stops: [
              {
                address: 'Balogun Market, Lagos Island',
                location: { lat: 6.4531, lng: 3.3882 },
              },
              {
                address: 'Admiralty Way, Lekki',
                location: { lat: 6.4474, lng: 3.4723 },
              },
            ],
            surgeMultiplier: surge,
          };

          const res = await request(app)
            .post('/api/v1/pricing/estimate')
            .send(payload);

          expect(res.status).toBe(200);
          const data = res.body;

          // 1. All monetary values must be finite integers
          expect(Number.isInteger(data.totalFareKobo)).toBe(true);
          expect(Number.isInteger(data.platformCommissionKobo)).toBe(true);
          expect(Number.isInteger(data.riderEarningKobo)).toBe(true);
          expect(Number.isInteger(data.baseFareKobo)).toBe(true);
          expect(Number.isInteger(data.distanceFareKobo)).toBe(true);
          expect(Number.isInteger(data.durationTrafficFareKobo)).toBe(true);
          expect(Number.isInteger(data.multiStopSurchargeKobo)).toBe(true);

          // 2. Financial Rounding: Total fare must be rounded to nearest ₦50 (5,000 kobo)
          expect(data.totalFareKobo % 5000).toBe(0);

          // 3. Golden Rule 6: Absolute zero-float-drift reconciliation:
          // platformCommissionKobo + riderEarningKobo === totalFareKobo
          expect(data.platformCommissionKobo + data.riderEarningKobo).toBe(data.totalFareKobo);

          // 4. Commission is 20%
          const commissionRatio = data.platformCommissionKobo / data.totalFareKobo;
          expect(commissionRatio).toBeCloseTo(0.2, 2);
        });
      }
    }
  });

  // SUITE 5: Redis 5-minute route cache hit (cached: false on 1st, cached: true on 2nd)
  describe('Suite 5: Redis 5-Minute Route & Fare Caching', () => {
    it('should return cached: false on initial calculation and cached: true on identical repeat', async () => {
      const tripPayload: FareEstimateRequest = {
        vehicleType: 'truck',
        pickup: {
          address: 'Trade Fair Complex, Ojo',
          location: { lat: 6.4592, lng: 3.2201 },
        },
        stops: [
          {
            address: 'Alaba International Market, Ojo',
            location: { lat: 6.4619, lng: 3.1932 },
          },
        ],
        surgeMultiplier: 1.0,
      };

      // Call 1: Fresh calculation (not cached)
      const res1 = await request(app)
        .post('/api/v1/pricing/estimate')
        .send(tripPayload);

      expect(res1.status).toBe(200);
      expect(res1.body.cached).toBe(false);

      // Call 2: Should hit Redis cache
      const res2 = await request(app)
        .post('/api/v1/pricing/estimate')
        .send(tripPayload);

      expect(res2.status).toBe(200);
      expect(res2.body.cached).toBe(true);

      // Verify payloads are identical
      expect(res2.body.totalFareKobo).toBe(res1.body.totalFareKobo);
      expect(res2.body.platformCommissionKobo).toBe(res1.body.platformCommissionKobo);
      expect(res2.body.riderEarningKobo).toBe(res1.body.riderEarningKobo);
      expect(res2.body.estimatedDistanceKm).toBe(res1.body.estimatedDistanceKm);
      expect(res2.body.encodedPolyline).toBe(res1.body.encodedPolyline);

      // Inspect Redis directly to verify 300s TTL
      const redis = getRedisClient();
      const keys = await redis.keys('pricing:estimate:*');
      expect(keys.length).toBeGreaterThan(0);

      const ttl = await redis.ttl(keys[0]!);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(300);
    });

    it('should reject invalid payload with 400 Bad Request', async () => {
      const invalidPayload = {
        vehicleType: 'helicopter', // invalid enum
        pickup: { address: 'Nowhere' },
        stops: [], // requires at least 1 stop
      };

      const res = await request(app)
        .post('/api/v1/pricing/estimate')
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(Array.isArray(res.body.issues)).toBe(true);
    });
  });
});
