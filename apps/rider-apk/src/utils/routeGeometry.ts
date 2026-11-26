import type { StyleSpecification } from 'maplibre-gl';

export interface LatLng {
  lat: number;
  lng: number;
}

const routeCache = new Map<string, LatLng[]>();

/** Converts explicit `{ lat, lng }` coordinates to `[lng, lat]` strictly for GeoJSON / MapLibre. */
export function toLngLatArray(point: LatLng): [number, number] {
  return [point.lng, point.lat];
}

/** Builds a closed GeoJSON `[lng, lat]` polygon approximating a circular geofence around `center`. */
export function buildRadarCircleCoordinates(
  center: LatLng,
  radiusKm: number,
  steps = 48
): [number, number][] {
  const earthRadiusKm = 6371;
  const latRad = (center.lat * Math.PI) / 180;
  const ring: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dLat = (radiusKm / earthRadiusKm) * (180 / Math.PI) * Math.sin(angle);
    const dLng =
      ((radiusKm / earthRadiusKm) * (180 / Math.PI) * Math.cos(angle)) /
      Math.max(0.15, Math.cos(latRad));
    ring.push([center.lng + dLng, center.lat + dLat]);
  }

  return ring;
}

/** Smooth 5-point curved fallback corridor when OSRM HTTP routing is offline or timed out. */
export function buildFallbackRoutePath(origin: LatLng, destination: LatLng): LatLng[] {
  const midLat = (origin.lat + destination.lat) / 2;
  const midLng = (origin.lng + destination.lng) / 2;
  const latSpan = destination.lat - origin.lat;
  const lngSpan = destination.lng - origin.lng;
  const offsetLat = -lngSpan * 0.08;
  const offsetLng = latSpan * 0.08;

  return [
    origin,
    { lat: (origin.lat + midLat) / 2 + offsetLat * 0.6, lng: (origin.lng + midLng) / 2 + offsetLng * 0.6 },
    { lat: midLat + offsetLat, lng: midLng + offsetLng },
    { lat: (midLat + destination.lat) / 2 + offsetLat * 0.6, lng: (midLng + destination.lng) / 2 + offsetLng * 0.6 },
    destination,
  ];
}

/** Fetches road-snapped polyline coordinates via public OSRM API with timeout and cache. */
export async function fetchRoadRoute(origin: LatLng, destination: LatLng): Promise<LatLng[]> {
  const cacheKey = `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}->${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;
  const cached = routeCache.get(cacheKey);
  if (cached) return cached;

  if (typeof fetch === 'undefined') {
    return buildFallbackRoutePath(origin, destination);
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 3500) : null;

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url, controller ? { signal: controller.signal } : undefined);
    if (!response.ok) {
      throw new Error(`OSRM HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      code?: string;
      routes?: Array<{ geometry?: { coordinates?: Array<[number, number]> } }>;
    };

    const coords = payload.routes?.[0]?.geometry?.coordinates;
    if (payload.code === 'Ok' && Array.isArray(coords) && coords.length >= 2) {
      const converted: LatLng[] = coords.map(([lng, lat]) => ({ lat, lng }));
      routeCache.set(cacheKey, converted);
      return converted;
    }
  } catch {
    // Graceful corridor fallback when offline or headless
  } finally {
    if (timer) clearTimeout(timer);
  }

  const fallback = buildFallbackRoutePath(origin, destination);
  routeCache.set(cacheKey, fallback);
  return fallback;
}

/** Light monochrome Google Maps style calibrated beneath Black & Atomic Orange overlays. */
export const BAYNIKS_GOOGLE_LIGHT_STYLE: Array<Record<string, unknown>> = [
  { elementType: 'geometry', stylers: [{ color: '#f4f4f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#52525b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e4e4e7' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e4e4e7' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d4d4d8' }] },
];

export const OPENFREEMAP_POSITRON_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

/** Resilient key-free OpenStreetMap raster style fallback for MapLibre if OpenFreeMap vector tiles fail. */
export const OSM_FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
      paint: {
        'raster-saturation': -0.85,
        'raster-brightness-min': 0.12,
        'raster-contrast': -0.1,
      },
    },
  ],
};

