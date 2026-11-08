import { describe, it, expect } from 'vitest';
import {
  toGeoJsonPoint,
  fromGeoJsonPoint,
  LatLngSchema,
  GeoJsonPointSchema,
  nairaToKobo,
  koboToNaira,
  formatNaira,
  FourDigitPinSchema,
  TrackingCodeSchema,
  normalizeNigerianPhone,
  RiderLocationPingSchema,
  TrackingUpdateSchema,
  JobNewOfferSchema,
  CreateOrderRequestSchema,
  encodeGooglePolyline,
  decodeGooglePolyline,
  lerpNumber,
  lerpLatLng,
  lerpBearingShortestArc,
  computeRemainingDistanceAndEta,
  haversineDistanceMeters,
} from '../index';

describe('Geospatial Coordinate Ordering Law (Golden Rule 4)', () => {
  const lagosCoord = { lat: 6.5244, lng: 3.3792 };
  const expectedGeoJson = {
    type: 'Point' as const,
    coordinates: [3.3792, 6.5244] as [number, number],
  };

  it('accurately maps { lat, lng } to GeoJSON [lng, lat] (Lagos coordinates)', () => {
    const geoPoint = toGeoJsonPoint(lagosCoord);
    expect(geoPoint).toEqual(expectedGeoJson);
    expect(geoPoint.coordinates[0]).toBe(3.3792); // Longitude first
    expect(geoPoint.coordinates[1]).toBe(6.5244); // Latitude second
  });

  it('accurately converts GeoJSON [lng, lat] back to { lat, lng }', () => {
    const converted = fromGeoJsonPoint(expectedGeoJson);
    expect(converted).toEqual(lagosCoord);
    expect(converted.lat).toBe(6.5244);
    expect(converted.lng).toBe(3.3792);
  });

  it('rejects invalid coordinates where latitude exceeds 90', () => {
    expect(() => LatLngSchema.parse({ lat: 105, lng: 3.3792 })).toThrow();
    expect(() => LatLngSchema.parse({ lat: -95, lng: 3.3792 })).toThrow();
  });

  it('rejects invalid coordinates where longitude exceeds 180', () => {
    expect(() => LatLngSchema.parse({ lat: 6.5244, lng: 185 })).toThrow();
    expect(() => LatLngSchema.parse({ lat: 6.5244, lng: -185 })).toThrow();
  });

  it('rejects malformed GeoJSON points', () => {
    // Latitude out of range in GeoJSON coordinates [lng, lat]
    expect(() =>
      GeoJsonPointSchema.parse({
        type: 'Point',
        coordinates: [3.3792, 95],
      })
    ).toThrow();

    // Wrong GeoJSON type
    expect(() =>
      GeoJsonPointSchema.parse({
        type: 'Polygon',
        coordinates: [3.3792, 6.5244],
      })
    ).toThrow();
  });
});

describe('Currency & Financial Precision (Golden Rule 6)', () => {
  it('safely converts fractional Naira to integer Kobo without floating-point drift', () => {
    // 19.99 * 100 in native JS equals 1998.9999999999998
    expect(nairaToKobo(19.99)).toBe(1999);
    expect(nairaToKobo(1500)).toBe(150000);
    expect(nairaToKobo(0.05)).toBe(5);
    expect(nairaToKobo(1234.56)).toBe(123456);
  });

  it('converts integer Kobo back to Naira accurately', () => {
    expect(koboToNaira(150000)).toBe(1500);
    expect(koboToNaira(1999)).toBe(19.99);
    expect(koboToNaira(5)).toBe(0.05);
  });

  it('formats kobo to Nigerian currency string', () => {
    const formatted = formatNaira(150000);
    expect(formatted).toContain('1,500.00');
  });

  it('throws on non-finite amounts', () => {
    expect(() => nairaToKobo(NaN)).toThrow(TypeError);
    expect(() => koboToNaira(Infinity)).toThrow(TypeError);
  });
});

describe('Validation Schemas (PIN, Tracking Code, Nigerian Phone)', () => {
  it('validates 4-digit numeric PINs and rejects malformed values', () => {
    expect(FourDigitPinSchema.parse('1234')).toBe('1234');
    expect(FourDigitPinSchema.parse('0000')).toBe('0000');
    expect(FourDigitPinSchema.parse('9876')).toBe('9876');

    expect(() => FourDigitPinSchema.parse('123')).toThrow();
    expect(() => FourDigitPinSchema.parse('12345')).toThrow();
    expect(() => FourDigitPinSchema.parse('12a4')).toThrow();
    expect(() => FourDigitPinSchema.parse('')).toThrow();
  });

  it('validates tracking code format (e.g. LGS-849201)', () => {
    expect(TrackingCodeSchema.parse('LGS-849201')).toBe('LGS-849201');
    expect(TrackingCodeSchema.parse('ABJ-123456')).toBe('ABJ-123456');

    expect(() => TrackingCodeSchema.parse('lgs-849201')).toThrow(); // lowercase
    expect(() => TrackingCodeSchema.parse('LG-849201')).toThrow();  // only 2 letters
    expect(() => TrackingCodeSchema.parse('LGS849201')).toThrow();   // missing hyphen
    expect(() => TrackingCodeSchema.parse('LGS-84920')).toThrow();   // 5 digits
  });

  it('normalizes Nigerian phone numbers to E.164 (+234...)', () => {
    expect(normalizeNigerianPhone('08031234567')).toBe('+2348031234567');
    expect(normalizeNigerianPhone('2348031234567')).toBe('+2348031234567');
    expect(normalizeNigerianPhone('+2348031234567')).toBe('+2348031234567');
    expect(normalizeNigerianPhone('0803-123-4567')).toBe('+2348031234567');

    expect(() => normalizeNigerianPhone('12345')).toThrow();
  });
});

describe('WebSocket Contract Schemas', () => {
  it('validates valid RiderLocationPing payload', () => {
    const validPing = {
      orderId: '654321',
      lat: 6.5244,
      lng: 3.3792,
      bearing: 90,
      speed: 15.5,
      accuracy: 5.0,
      batteryLevel: 85,
      timestamp: Date.now(),
    };
    expect(RiderLocationPingSchema.parse(validPing)).toEqual(validPing);
  });

  it('rejects malformed RiderLocationPing (invalid bearing or lat)', () => {
    expect(() =>
      RiderLocationPingSchema.parse({
        lat: 95, // out of range
        lng: 3.3792,
        bearing: 90,
        speed: 10,
        accuracy: 5,
        timestamp: Date.now(),
      })
    ).toThrow();

    expect(() =>
      RiderLocationPingSchema.parse({
        lat: 6.5244,
        lng: 3.3792,
        bearing: 400, // bearing > 360
        speed: 10,
        accuracy: 5,
        timestamp: Date.now(),
      })
    ).toThrow();
  });

  it('validates valid TrackingUpdate payload', () => {
    const validUpdate = {
      trackingCode: 'LGS-849201',
      riderId: 'rider_01',
      lat: 6.5244,
      lng: 3.3792,
      bearing: 180,
      speed: 22.0,
      status: 'in_transit' as const,
      etaMinutes: 12,
      updatedAt: Date.now(),
    };
    expect(TrackingUpdateSchema.parse(validUpdate)).toEqual(validUpdate);
  });

  it('rejects malformed TrackingUpdate (invalid order status)', () => {
    expect(() =>
      TrackingUpdateSchema.parse({
        trackingCode: 'LGS-849201',
        riderId: 'rider_01',
        lat: 6.5244,
        lng: 3.3792,
        bearing: 180,
        speed: 22.0,
        status: 'flying_on_rocket', // invalid status
        updatedAt: Date.now(),
      })
    ).toThrow();
  });

  it('validates valid JobNewOffer payload', () => {
    const validOffer = {
      orderId: 'ord_123',
      trackingCode: 'LGS-849201',
      pickupAddress: 'Plot 12, Admiralty Way, Lekki Phase 1',
      pickupLandmark: 'Beside Ebeano Supermarket',
      estimatedDistanceKm: 7.5,
      riderEarningKobo: 250000, // ₦2,500.00
      stopsCount: 2,
      expiresAt: Date.now() + 30000,
    };
    expect(JobNewOfferSchema.parse(validOffer)).toEqual(validOffer);
  });

  it('rejects negative earnings or distance in JobNewOffer', () => {
    expect(() =>
      JobNewOfferSchema.parse({
        orderId: 'ord_123',
        trackingCode: 'LGS-849201',
        pickupAddress: 'Plot 12, Admiralty Way',
        estimatedDistanceKm: -5, // invalid negative
        riderEarningKobo: 250000,
        stopsCount: 1,
        expiresAt: Date.now(),
      })
    ).toThrow();
  });
});

describe('Stage 6: Order Contracts & Polyline Utilities', () => {
  it('validates and normalizes sender and recipient Nigerian phone numbers', () => {
    const rawOrder = {
      vehicleType: 'bike',
      paymentMethod: 'pay_on_pickup',
      pickup: {
        address: 'Computer Village, Ikeja',
        landmark: 'Opposite Slot, Otigba Street',
        location: { lat: 6.5933, lng: 3.3421 },
        contactName: 'Emeka Chukwu',
        contactPhone: '08031234567', // local format
      },
      stops: [
        {
          recipientName: 'Bisi Adeleke',
          recipientPhone: '2348029876543', // 234 format without +
          dropoffAddress: 'Admiralty Way, Lekki',
          dropoffLandmark: 'Beside Tastee Fried Chicken',
          dropoffLocation: { lat: 6.4474, lng: 3.4723 },
          packageDescription: 'Box of clothes',
        },
      ],
    };

    const parsed = CreateOrderRequestSchema.parse(rawOrder);
    expect(parsed.pickup.contactPhone).toBe('+2348031234567');
    expect(parsed.stops[0]!.recipientPhone).toBe('+2348029876543');
  });

  it('rejects order with 0 stops', () => {
    const invalidOrder = {
      vehicleType: 'bike',
      paymentMethod: 'wallet',
      pickup: {
        address: 'Computer Village, Ikeja',
        landmark: 'Otigba Street',
        location: { lat: 6.5933, lng: 3.3421 },
        contactName: 'Emeka Chukwu',
        contactPhone: '+2348031234567',
      },
      stops: [], // 0 stops
    };

    expect(() => CreateOrderRequestSchema.parse(invalidOrder)).toThrow();
  });

  it('rejects order with missing pickup or drop-off landmark', () => {
    const missingPickupLandmark = {
      vehicleType: 'bike',
      paymentMethod: 'wallet',
      pickup: {
        address: 'Computer Village, Ikeja',
        landmark: 'A', // too short (< 2 chars)
        location: { lat: 6.5933, lng: 3.3421 },
        contactName: 'Emeka Chukwu',
        contactPhone: '+2348031234567',
      },
      stops: [
        {
          recipientName: 'Bisi Adeleke',
          recipientPhone: '+2348029876543',
          dropoffAddress: 'Admiralty Way, Lekki',
          dropoffLandmark: 'Beside TFC',
          dropoffLocation: { lat: 6.4474, lng: 3.4723 },
          packageDescription: 'Phone chargers',
        },
      ],
    };
    expect(() => CreateOrderRequestSchema.parse(missingPickupLandmark)).toThrow();
  });

  it('Stage 15: defaults vehicleType to bike when omitted in order creation and fare estimate', () => {
    const orderPayloadWithoutVehicle: any = {
      paymentMethod: 'wallet',
      pickup: {
        address: 'Computer Village, Ikeja',
        landmark: 'Near Slot main entrance',
        location: { lat: 6.5933, lng: 3.3421 },
        contactName: 'Emeka Chukwu',
        contactPhone: '+2348031234567',
      },
      stops: [
        {
          recipientName: 'Bisi Adeleke',
          recipientPhone: '+2348029876543',
          dropoffAddress: 'Admiralty Way, Lekki',
          dropoffLandmark: 'Beside TFC',
          dropoffLocation: { lat: 6.4474, lng: 3.4723 },
          packageDescription: 'Phone chargers',
        },
      ],
    };

    const parsedOrder = CreateOrderRequestSchema.parse(orderPayloadWithoutVehicle);
    expect(parsedOrder.vehicleType).toBe('bike');
  });

  it('decodes and encodes Google Polylines with sub-meter fidelity', () => {
    const originalPoints = [
      { lat: 6.5933, lng: 3.3421 },
      { lat: 6.5186, lng: 3.3712 },
      { lat: 6.4474, lng: 3.4723 },
    ];

    const encoded = encodeGooglePolyline(originalPoints);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodeGooglePolyline(encoded);
    expect(decoded.length).toBe(originalPoints.length);

    for (let i = 0; i < originalPoints.length; i++) {
      expect(decoded[i]!.lat).toBeCloseTo(originalPoints[i]!.lat, 4);
      expect(decoded[i]!.lng).toBeCloseTo(originalPoints[i]!.lng, 4);
    }
  });

  describe('Kinematics & Interpolation Math Utilities (Stage 14)', () => {
    it('lerpNumber correctly interpolates and clamps to [0, 1]', () => {
      expect(lerpNumber(10, 20, 0)).toBe(10);
      expect(lerpNumber(10, 20, 0.5)).toBe(15);
      expect(lerpNumber(10, 20, 1)).toBe(20);
      expect(lerpNumber(10, 20, -0.5)).toBe(10); // clamped
      expect(lerpNumber(10, 20, 1.5)).toBe(20); // clamped
    });

    it('lerpLatLng smoothly interpolates between two geo points', () => {
      const ikeja = { lat: 6.5933, lng: 3.3421 };
      const yaba = { lat: 6.5186, lng: 3.3712 };
      const mid = lerpLatLng(ikeja, yaba, 0.5);

      expect(mid.lat).toBeCloseTo(6.55595, 4);
      expect(mid.lng).toBeCloseTo(3.35665, 4);
    });

    it('lerpBearingShortestArc rotates across 0°/360° north boundary without 350° backspin', () => {
      // 350° to 10° should rotate +20° clockwise across 0°, midpoint is 0° (or 360°)
      const midClockwise = lerpBearingShortestArc(350, 10, 0.5);
      expect(midClockwise).toBe(0);

      // 10° to 350° should rotate -20° counter-clockwise across 0°, midpoint is 0° (or 360°)
      const midCounterClockwise = lerpBearingShortestArc(10, 350, 0.5);
      expect(midCounterClockwise).toBe(0);

      // Normal rotation within range: 90° to 180° at t=0.5 -> 135°
      expect(lerpBearingShortestArc(90, 180, 0.5)).toBe(135);
      // 180° to 90° at t=0.5 -> 135°
      expect(lerpBearingShortestArc(180, 90, 0.5)).toBe(135);
    });

    it('computeRemainingDistanceAndEta calculates accurate remaining distance & ETA with Lagos factor', () => {
      const ikeja = { lat: 6.5933, lng: 3.3421 };
      const vi = { lat: 6.4281, lng: 3.4219 };

      const haversineDirectMeters = haversineDistanceMeters(ikeja, vi);
      expect(haversineDirectMeters).toBeGreaterThan(15000); // ~20km

      // When stopped / speed 0, uses default 22 km/h
      const stationaryResult = computeRemainingDistanceAndEta(ikeja, vi, 0);
      expect(stationaryResult.remainingDistanceKm).toBeCloseTo((haversineDirectMeters * 1.32) / 1000, 1);
      expect(stationaryResult.etaMinutes).toBeGreaterThan(10);

      // When moving at 40 km/h
      const movingResult = computeRemainingDistanceAndEta(ikeja, vi, 40);
      expect(movingResult.remainingDistanceKm).toBe(stationaryResult.remainingDistanceKm);
      expect(movingResult.etaMinutes).toBeLessThan(stationaryResult.etaMinutes);
    });
  });
});
