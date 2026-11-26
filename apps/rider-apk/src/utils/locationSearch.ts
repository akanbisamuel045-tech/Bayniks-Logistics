import type { LatLng } from './routeGeometry';

export interface MapSearchPlace {
  id: string;
  label: string;
  address: string;
  coords: LatLng;
  category?: 'home' | 'favourite' | 'landmark';
}

export const HOME_SAVED_PLACE: MapSearchPlace = {
  id: 'home',
  label: 'Home',
  address: 'Maryland, Ikeja, Lagos',
  coords: { lat: 6.5718, lng: 3.3666 },
  category: 'home',
};

export const FAVOURITE_SAVED_PLACE: MapSearchPlace = {
  id: 'fav',
  label: 'Favourite',
  address: 'Ikeja, Computer Village, Lagos',
  coords: { lat: 6.5933, lng: 3.3421 },
  category: 'favourite',
};

export const CURATED_NIGERIA_PLACES: MapSearchPlace[] = [
  HOME_SAVED_PLACE,
  FAVOURITE_SAVED_PLACE,
  {
    id: 'vi-towers',
    label: 'Victoria Island',
    address: 'Victoria Island Towers, Lagos',
    coords: { lat: 6.4281, lng: 3.4219 },
    category: 'landmark',
  },
  {
    id: 'yaba-tech',
    label: 'Yaba Corridor',
    address: 'Commercial Ave, Yaba, Lagos',
    coords: { lat: 6.5158, lng: 3.3718 },
    category: 'landmark',
  },
  {
    id: 'lekki-1',
    label: 'Lekki Phase 1',
    address: 'Admiralty Way, Lekki Phase 1, Lagos',
    coords: { lat: 6.4474, lng: 3.4723 },
    category: 'landmark',
  },
  {
    id: 'warri-airport',
    label: 'Warri Airport Road',
    address: '78 Airport Road, Warri, Delta',
    coords: { lat: 5.5345, lng: 5.7524 },
    category: 'landmark',
  },
];

/** Searches Nigerian places via OpenStreetMap Nominatim + curated local hubs fallback. */
export async function searchMapLocations(query: string): Promise<MapSearchPlace[]> {
  const trimmed = query.trim().toLowerCase();
  const localMatches = trimmed
    ? CURATED_NIGERIA_PLACES.filter(
        (p) =>
          p.address.toLowerCase().includes(trimmed) ||
          p.label.toLowerCase().includes(trimmed)
      )
    : CURATED_NIGERIA_PLACES;

  if (trimmed.length < 3 || typeof fetch === 'undefined') {
    return localMatches;
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 3500) : null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=ng&limit=6&q=${encodeURIComponent(
      query.trim()
    )}`;
    const res = await fetch(url, {
      ...(controller ? { signal: controller.signal } : {}),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return localMatches;

    const payload = (await res.json()) as Array<{
      place_id?: number | string;
      display_name?: string;
      name?: string;
      lat?: string;
      lon?: string;
    }>;

    const remotePlaces: MapSearchPlace[] = payload
      .filter((item) => item.lat && item.lon && item.display_name)
      .map((item, idx) => {
        const displayName = String(item.display_name);
        const shortLabel =
          item.name?.trim() || displayName.split(',')[0]?.trim() || 'Location';
        return {
          id: `osm-${item.place_id ?? idx}`,
          label: shortLabel,
          address: displayName,
          coords: {
            lat: Number(item.lat),
            lng: Number(item.lon),
          },
          category: 'landmark' as const,
        };
      })
      .filter((item) => Number.isFinite(item.coords.lat) && Number.isFinite(item.coords.lng));

    const combined = [...localMatches];
    remotePlaces.forEach((remote) => {
      const duplicate = combined.some(
        (existing) => existing.address.toLowerCase() === remote.address.toLowerCase()
      );
      if (!duplicate) combined.push(remote);
    });
    return combined;
  } catch {
    return localMatches;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface DeviceLocationFix extends LatLng {
  accuracy?: number;
  heading?: number;
  speed?: number;
}

/** Fetches the device/browser's current physical GPS coordinates (`{ lat, lng }`). */
export function requestRealDeviceLocation(): Promise<DeviceLocationFix | null> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading ?? 0,
            speed: pos.coords.speed ?? 0,
          });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      );
    } catch {
      resolve(null);
    }
  });
}

/** Subscribes to live device GPS updates and returns a clean stop callback. */
export function watchRealDeviceLocation(
  onFix: (fix: DeviceLocationFix) => void
): () => void {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return () => undefined;
  }

  let watchId: number | null = null;
  try {
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        onFix({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading ?? 0,
          speed: pos.coords.speed ?? 0,
        });
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  } catch {
    return () => undefined;
  }

  return () => {
    if (watchId !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        navigator.geolocation.clearWatch(watchId);
      } catch {
        // Ignore cleanup errors
      }
    }
  };
}
