import { LatLng } from './geo';

/**
 * Linearly interpolates between two numbers with progress clamped to [0, 1].
 */
export function lerpNumber(start: number, end: number, t: number): number {
  const clampedT = Math.max(0, Math.min(1, t));
  return start + (end - start) * clampedT;
}

/**
 * Linearly interpolates between two geographic coordinates with progress clamped to [0, 1].
 */
export function lerpLatLng(from: LatLng, to: LatLng, t: number): LatLng {
  const clampedT = Math.max(0, Math.min(1, t));
  return {
    lat: Number((from.lat + (to.lat - from.lat) * clampedT).toFixed(6)),
    lng: Number((from.lng + (to.lng - from.lng) * clampedT).toFixed(6)),
  };
}

/**
 * Interpolates compass angles along the shortest rotational arc.
 * Wraps seamlessly across 0°/360° (e.g. 350° -> 10° turns +20° clockwise across North).
 * Returns normalized bearing in [0, 360).
 */
export function lerpBearingShortestArc(
  fromBearing: number,
  toBearing: number,
  t: number
): number {
  const clampedT = Math.max(0, Math.min(1, t));
  // Shortest angular difference between -180 and +180 degrees
  const diff = (((toBearing - fromBearing) % 360) + 540) % 360 - 180;
  const interpolated = fromBearing + diff * clampedT;
  return ((interpolated % 360) + 360) % 360;
}

/**
 * Calculates Haversine distance in meters between two coordinates.
 */
export function haversineDistanceMeters(pos1: LatLng, pos2: LatLng): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (pos1.lat * Math.PI) / 180;
  const φ2 = (pos2.lat * Math.PI) / 180;
  const Δφ = ((pos2.lat - pos1.lat) * Math.PI) / 180;
  const Δλ = ((pos2.lng - pos1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Computes estimated remaining route distance and ETA in minutes.
 * Uses Haversine distance with 1.32 Lagos road circuity factor.
 * Clamps effective urban speed between 18 km/h and 60 km/h so ETA never divides by zero
 * when a rider is stationary in Lagos traffic.
 */
export function computeRemainingDistanceAndEta(
  riderPos: LatLng,
  targetPos: LatLng,
  currentSpeedKmh: number
): { remainingDistanceKm: number; etaMinutes: number } {
  const straightLineMeters = haversineDistanceMeters(riderPos, targetPos);
  // 1.32 circuity factor for Lagos road geometry
  const roadDistanceKm = (straightLineMeters * 1.32) / 1000;

  // Clamp effective speed to avoid division by zero or unrealistic speeds
  const effectiveSpeedKmh =
    currentSpeedKmh < 5 ? 24 : Math.min(60, Math.max(18, currentSpeedKmh));

  const etaHours = roadDistanceKm / effectiveSpeedKmh;
  const etaMinutes = Math.max(1, Math.round(etaHours * 60));

  return {
    remainingDistanceKm: Number(roadDistanceKm.toFixed(2)),
    etaMinutes,
  };
}

