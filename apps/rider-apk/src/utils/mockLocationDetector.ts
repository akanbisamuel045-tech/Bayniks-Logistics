/**
 * Anti-Fraud & Mock-Location (Fake GPS) Detection Utility
 * Protects platform integrity against simulated or spoofed delivery arrivals.
 */

export interface RawLocationCheckInput {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  simulated?: boolean;
  isMock?: boolean;
}

export interface MockLocationResult {
  isMockLocation: boolean;
  reason?: string;
}

export function detectMockLocation(location: RawLocationCheckInput | null | undefined): MockLocationResult {
  if (!location) {
    return { isMockLocation: false };
  }

  // 1. Native Android Provider Flag (Capacitor Background Geolocation provides `simulated: true`)
  if (location.simulated === true || location.isMock === true) {
    return {
      isMockLocation: true,
      reason: 'Android Mock Location provider active (Fake GPS app detected)',
    };
  }

  // 2. Anomaly: Accuracy exactly 0.0 or negative (impossible on real GPS hardware in Nigeria)
  if (typeof location.accuracy === 'number' && location.accuracy <= 0) {
    return {
      isMockLocation: true,
      reason: 'Invalid GPS accuracy signature (0m hardware anomaly)',
    };
  }

  // 3. Anomaly: Impossible motorcycle speeds (> 160 km/h in urban Lagos)
  if (typeof location.speed === 'number' && location.speed > 45) { // 45 m/s = 162 km/h
    return {
      isMockLocation: true,
      reason: 'Impossible velocity jump (>160 km/h teleportation)',
    };
  }

  return { isMockLocation: false };
}

