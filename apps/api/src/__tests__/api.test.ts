import { describe, it, expect } from 'vitest';
import { processTelemetryPing } from '../index';

describe('API Telemetry Ingestion Contract Validation', () => {
  it('validates raw ping and returns both valid ping and GeoJSON point adhering to [lng, lat] rule', () => {
    const raw = {
      orderId: 'ord_test_999',
      lat: 6.6018,
      lng: 3.3515, // Ikeja, Lagos
      bearing: 120,
      speed: 25.0,
      accuracy: 3.0,
      batteryLevel: 80,
      timestamp: Date.now(),
    };

    const { validPing, geoJson } = processTelemetryPing(raw);

    expect(validPing.lat).toBe(6.6018);
    expect(validPing.lng).toBe(3.3515);

    // Rule 4 verification: coordinates must be [longitude, latitude]
    expect(geoJson.type).toBe('Point');
    expect(geoJson.coordinates[0]).toBe(3.3515);
    expect(geoJson.coordinates[1]).toBe(6.6018);
  });

  it('rejects payload with missing required fields or invalid latitude', () => {
    const invalid = {
      orderId: 'ord_bad',
      lat: 105, // invalid lat
      lng: 3.3515,
      bearing: 120,
      speed: 25.0,
      accuracy: 3.0,
      timestamp: Date.now(),
    };

    expect(() => processTelemetryPing(invalid)).toThrow();
  });
});
