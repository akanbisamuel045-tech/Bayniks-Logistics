/**
 * Geofencing & Proximity Arrival Calculation Utility
 * Uses the Haversine formula to calculate distance in meters between rider and destination.
 */

export const ARRIVAL_PROXIMITY_THRESHOLD_METERS = 120; // 120 meters trigger zone

/**
 * Calculates distance in meters between two coordinates.
 */
export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export interface ProximityCheckResult {
  isWithinProximity: boolean;
  distanceMeters: number;
  formattedDistance: string;
}

/**
 * Checks whether rider coordinates are within auto-arrival threshold of target.
 */
export function checkArrivalProximity(
  riderLocation: { lat: number; lng: number } | null | undefined,
  targetLocation: { lat: number; lng: number } | null | undefined,
  thresholdMeters = ARRIVAL_PROXIMITY_THRESHOLD_METERS
): ProximityCheckResult {
  if (!riderLocation || !targetLocation) {
    return {
      isWithinProximity: false,
      distanceMeters: Infinity,
      formattedDistance: 'Calculating...',
    };
  }

  const distanceMeters = calculateDistanceMeters(
    riderLocation.lat,
    riderLocation.lng,
    targetLocation.lat,
    targetLocation.lng
  );

  const isWithinProximity = distanceMeters <= thresholdMeters;

  let formattedDistance = '';
  if (distanceMeters < 1000) {
    formattedDistance = `${distanceMeters}m`;
  } else {
    formattedDistance = `${(distanceMeters / 1000).toFixed(1)}km`;
  }

  return {
    isWithinProximity,
    distanceMeters,
    formattedDistance,
  };
}
