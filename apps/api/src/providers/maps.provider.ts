import { LatLng, PlacePrediction } from '@logistics/shared-types';

export interface RouteLeg {
  distanceKm: number;
  durationMinutes: number;
  startLocation: LatLng;
  endLocation: LatLng;
}

export interface RouteCalculationResult {
  distanceKm: number;
  durationMinutes: number;
  encodedPolyline: string;
  legs: RouteLeg[];
}

export interface IMapsProvider {
  autocomplete(query: string): Promise<PlacePrediction[]>;
  calculateRoute(pickup: LatLng, stops: LatLng[]): Promise<RouteCalculationResult>;
}

/**
 * Standard Haversine formula to compute great-circle distance between two points in km.
 */
export function calculateHaversineDistanceKm(p1: LatLng, p2: LatLng): number {
  const R = 6371; // Earth radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Google Encoded Polyline algorithm encoder.
 * Encodes array of { lat, lng } points into standard ASCII polyline string.
 */
export function encodePolyline(points: LatLng[]): string {
  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const point of points) {
    const lat = Math.round(point.lat * 1e5);
    const lng = Math.round(point.lng * 1e5);

    const dLat = lat - prevLat;
    const dLng = lng - prevLng;

    prevLat = lat;
    prevLng = lng;

    encoded += encodeSignedNumber(dLat);
    encoded += encodeSignedNumber(dLng);
  }

  return encoded;
}

function encodeSignedNumber(num: number): string {
  const sgnNum = num < 0 ? ~(num << 1) : num << 1;
  return encodeNumber(sgnNum);
}

function encodeNumber(num: number): string {
  let encodeString = '';
  let n = num;
  while (n >= 0x20) {
    encodeString += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
    n >>= 5;
  }
  encodeString += String.fromCharCode(n + 63);
  return encodeString;
}

/**
 * Decodes a Google Encoded Polyline string back into an array of { lat, lng } points.
 */
export function decodePolyline(encoded: string): LatLng[] {
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  const points: LatLng[] = [];

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    points.push({
      lat: Number((lat / 1e5).toFixed(6)),
      lng: Number((lng / 1e5).toFixed(6)),
    });
  }

  return points;
}

/**
 * Curated Nigerian / Lagos landmarks for deterministic offline autocomplete.
 */
export const NIGERIAN_LANDMARKS_GAZETTEER: Array<PlacePrediction & { lat: number; lng: number }> = [
  {
    placeId: 'ng_place_ikeja_computer_village',
    description: 'Computer Village, Otigba Street, Ikeja, Lagos, Nigeria',
    mainText: 'Computer Village',
    secondaryText: 'Otigba Street, Ikeja, Lagos',
    lat: 6.5933,
    lng: 3.3421,
  },
  {
    placeId: 'ng_place_ikeja_allen_avenue',
    description: 'Allen Avenue, Ikeja, Lagos, Nigeria',
    mainText: 'Allen Avenue',
    secondaryText: 'Ikeja, Lagos',
    lat: 6.6018,
    lng: 3.3515,
  },
  {
    placeId: 'ng_place_ikeja_city_mall',
    description: 'Ikeja City Mall (ICM), Obafemi Awolowo Way, Alausa, Ikeja, Lagos',
    mainText: 'Ikeja City Mall (ICM)',
    secondaryText: 'Obafemi Awolowo Way, Alausa, Ikeja',
    lat: 6.6198,
    lng: 3.3587,
  },
  {
    placeId: 'ng_place_yaba_tech',
    description: 'Yaba College of Technology (Yabatech), Herbert Macaulay Way, Yaba, Lagos',
    mainText: 'Yaba College of Technology (Yabatech)',
    secondaryText: 'Herbert Macaulay Way, Yaba, Lagos',
    lat: 6.5186,
    lng: 3.3712,
  },
  {
    placeId: 'ng_place_unilag_akoka',
    description: 'University of Lagos (UNILAG), Akoka, Yaba, Lagos, Nigeria',
    mainText: 'University of Lagos (UNILAG)',
    secondaryText: 'Akoka, Yaba, Lagos',
    lat: 6.5173,
    lng: 3.3987,
  },
  {
    placeId: 'ng_place_surulere_national_stadium',
    description: 'National Stadium, Western Avenue, Surulere, Lagos, Nigeria',
    mainText: 'National Stadium',
    secondaryText: 'Western Avenue, Surulere, Lagos',
    lat: 6.4969,
    lng: 3.3615,
  },
  {
    placeId: 'ng_place_surulere_teslim_balogun',
    description: 'Teslim Balogun Stadium, Western Avenue, Surulere, Lagos, Nigeria',
    mainText: 'Teslim Balogun Stadium',
    secondaryText: 'Western Avenue, Surulere, Lagos',
    lat: 6.5008,
    lng: 3.3592,
  },
  {
    placeId: 'ng_place_surulere_ojuelegba',
    description: 'Ojuelegba Underbridge, Surulere, Lagos, Nigeria',
    mainText: 'Ojuelegba Underbridge',
    secondaryText: 'Surulere, Lagos',
    lat: 6.5142,
    lng: 3.3638,
  },
  {
    placeId: 'ng_place_maryland_mall',
    description: 'Maryland Mall, Ikorodu Road, Maryland, Lagos, Nigeria',
    mainText: 'Maryland Mall',
    secondaryText: 'Ikorodu Road, Maryland, Lagos',
    lat: 6.5721,
    lng: 3.3683,
  },
  {
    placeId: 'ng_place_ojota_interchange',
    description: 'Ojota Bus Interchange, Ikorodu Road, Ojota, Lagos, Nigeria',
    mainText: 'Ojota Bus Interchange',
    secondaryText: 'Ojota, Lagos',
    lat: 6.5828,
    lng: 3.3857,
  },
  {
    placeId: 'ng_place_vi_adetokunbo_ademola',
    description: 'Adetokunbo Ademola Street, Victoria Island, Lagos, Nigeria',
    mainText: 'Adetokunbo Ademola Street',
    secondaryText: 'Victoria Island, Lagos',
    lat: 6.4281,
    lng: 3.4219,
  },
  {
    placeId: 'ng_place_vi_eko_hotel',
    description: 'Eko Hotel & Suites, Plot 1415 Adetokunbo Ademola Street, Victoria Island, Lagos',
    mainText: 'Eko Hotel & Suites',
    secondaryText: 'Plot 1415 Adetokunbo Ademola Street, VI, Lagos',
    lat: 6.4269,
    lng: 3.4312,
  },
  {
    placeId: 'ng_place_lekki_admiralty_way',
    description: 'Admiralty Way, Lekki Phase 1, Eti-Osa, Lagos, Nigeria',
    mainText: 'Admiralty Way',
    secondaryText: 'Lekki Phase 1, Eti-Osa, Lagos',
    lat: 6.4474,
    lng: 3.4723,
  },
  {
    placeId: 'ng_place_lekki_toll_gate',
    description: 'Lekki Toll Gate, Lekki-Epe Expressway, Lekki, Lagos, Nigeria',
    mainText: 'Lekki Toll Gate',
    secondaryText: 'Lekki-Epe Expressway, Lekki, Lagos',
    lat: 6.4385,
    lng: 3.4411,
  },
  {
    placeId: 'ng_place_chevron_drive',
    description: 'Chevron Drive, Lekki-Epe Expressway, Lekki Peninsula, Lagos',
    mainText: 'Chevron Drive',
    secondaryText: 'Lekki Peninsula, Lagos',
    lat: 6.4398,
    lng: 3.5358,
  },
  {
    placeId: 'ng_place_ajah_roundabout',
    description: 'Ajah Roundabout, Lekki-Epe Expressway, Ajah, Lagos, Nigeria',
    mainText: 'Ajah Roundabout',
    secondaryText: 'Lekki-Epe Expressway, Ajah, Lagos',
    lat: 6.4674,
    lng: 3.5714,
  },
  {
    placeId: 'ng_place_festac_town',
    description: 'Festac Town 1st Avenue, Amuwo Odofin, Festac, Lagos, Nigeria',
    mainText: 'Festac Town 1st Avenue',
    secondaryText: 'Amuwo Odofin, Festac, Lagos',
    lat: 6.4698,
    lng: 3.2833,
  },
  {
    placeId: 'ng_place_oshodi_interchange',
    description: 'Oshodi Transport Interchange, Agege Motor Road, Oshodi, Lagos, Nigeria',
    mainText: 'Oshodi Transport Interchange',
    secondaryText: 'Agege Motor Road, Oshodi, Lagos',
    lat: 6.5569,
    lng: 3.3524,
  },
  {
    placeId: 'ng_place_lagos_island_balogun',
    description: 'Balogun Market, Lagos Island, Lagos, Nigeria',
    mainText: 'Balogun Market',
    secondaryText: 'Lagos Island, Lagos',
    lat: 6.4531,
    lng: 3.3882,
  },
  {
    placeId: 'ng_place_trade_fair_complex',
    description: 'Lagos International Trade Fair Complex, Badagry Expressway, Ojo, Lagos',
    mainText: 'Lagos International Trade Fair Complex',
    secondaryText: 'Badagry Expressway, Ojo, Lagos',
    lat: 6.4592,
    lng: 3.2201,
  },
  {
    placeId: 'ng_place_alaba_international',
    description: 'Alaba International Market, Ojo, Lagos, Nigeria',
    mainText: 'Alaba International Market',
    secondaryText: 'Ojo, Lagos',
    lat: 6.4619,
    lng: 3.1932,
  },
];

/**
 * Offline / Local deterministic MapsProvider implementation.
 * Uses Nigerian gazetteer and Haversine + 1.32x urban winding factor.
 */
export class OfflineMapsProvider implements IMapsProvider {
  /**
   * Searches the gazetteer for matching Nigerian places.
   */
  async autocomplete(query: string): Promise<PlacePrediction[]> {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return NIGERIAN_LANDMARKS_GAZETTEER.slice(0, 5).map(this.toPrediction);
    }

    const matches = NIGERIAN_LANDMARKS_GAZETTEER.filter((item) => {
      const desc = item.description.toLowerCase();
      const main = item.mainText.toLowerCase();
      const sec = item.secondaryText.toLowerCase();
      return desc.includes(trimmed) || main.includes(trimmed) || sec.includes(trimmed);
    });

    // Sort by relevance (startsWith gets priority over contains)
    matches.sort((a, b) => {
      const aStarts = a.mainText.toLowerCase().startsWith(trimmed);
      const bStarts = b.mainText.toLowerCase().startsWith(trimmed);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });

    return matches.slice(0, 10).map(this.toPrediction);
  }

  /**
   * Computes route distance, duration, and encoded polyline across multiple stops.
   * Uses Haversine * 1.32 Lagos road winding factor.
   */
  async calculateRoute(pickup: LatLng, stops: LatLng[]): Promise<RouteCalculationResult> {
    const allWaypoints = [pickup, ...stops];
    const legs: RouteLeg[] = [];
    let totalDistanceKm = 0;
    let totalDurationMinutes = 0;

    const polylineCoordinates: LatLng[] = [];

    for (let i = 0; i < allWaypoints.length - 1; i++) {
      const from = allWaypoints[i]!;
      const to = allWaypoints[i + 1]!;

      const straightLineKm = calculateHaversineDistanceKm(from, to);
      // 1.32 urban winding factor to model actual Lagos street networks
      const roadDistanceKm = Number((straightLineKm * 1.32).toFixed(2));

      // Urban speed model: average 25 km/h in Lagos traffic + 5 mins handling per stop
      const baseDurationMin = Math.round((roadDistanceKm / 25) * 60);
      const legDurationMinutes = Math.max(5, baseDurationMin + 5);

      legs.push({
        distanceKm: roadDistanceKm,
        durationMinutes: legDurationMinutes,
        startLocation: from,
        endLocation: to,
      });

      totalDistanceKm += roadDistanceKm;
      totalDurationMinutes += legDurationMinutes;

      // Interpolate points for smooth polyline rendering
      const intermediateSteps = 4;
      for (let s = 0; s < intermediateSteps; s++) {
        const fraction = s / intermediateSteps;
        polylineCoordinates.push({
          lat: Number((from.lat + (to.lat - from.lat) * fraction).toFixed(6)),
          lng: Number((from.lng + (to.lng - from.lng) * fraction).toFixed(6)),
        });
      }
    }

    const destination = allWaypoints[allWaypoints.length - 1]!;
    polylineCoordinates.push({
      lat: Number(destination.lat.toFixed(6)),
      lng: Number(destination.lng.toFixed(6)),
    });

    const encodedPolyline = encodePolyline(polylineCoordinates);

    return {
      distanceKm: Number(totalDistanceKm.toFixed(2)),
      durationMinutes: totalDurationMinutes,
      encodedPolyline,
      legs,
    };
  }

  private toPrediction(item: typeof NIGERIAN_LANDMARKS_GAZETTEER[number]): PlacePrediction {
    return {
      placeId: item.placeId,
      description: item.description,
      mainText: item.mainText,
      secondaryText: item.secondaryText,
      lat: item.lat,
      lng: item.lng,
    };
  }
}

/**
 * Factory creating the active MapsProvider instance.
 * Automatically uses Google Maps when API key is present, falling back to OfflineMapsProvider.
 */
export class GoogleMapsProvider implements IMapsProvider {
  private fallbackProvider = new OfflineMapsProvider();
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async autocomplete(query: string): Promise<PlacePrediction[]> {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query
      )}&components=country:ng&key=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Places API returned HTTP ${response.status}`);
      }
      const data = (await response.json()) as {
        status: string;
        predictions?: Array<{
          place_id: string;
          description: string;
          structured_formatting?: { main_text: string; secondary_text?: string };
        }>;
      };

      if (data.status !== 'OK' || !data.predictions) {
        return this.fallbackProvider.autocomplete(query);
      }

      return data.predictions.map((p) => ({
        placeId: p.place_id,
        description: p.description,
        mainText: p.structured_formatting?.main_text || p.description,
        secondaryText: p.structured_formatting?.secondary_text || 'Nigeria',
      }));
    } catch {
      return this.fallbackProvider.autocomplete(query);
    }
  }

  async calculateRoute(pickup: LatLng, stops: LatLng[]): Promise<RouteCalculationResult> {
    try {
      const lastStop = stops[stops.length - 1];
      if (!lastStop) {
        return this.fallbackProvider.calculateRoute(pickup, stops);
      }
      const waypoints = stops.slice(0, -1).map((s) => `${s.lat},${s.lng}`).join('|');
      const waypointsParam = waypoints ? `&waypoints=${waypoints}` : '';
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${pickup.lat},${pickup.lng}&destination=${lastStop.lat},${lastStop.lng}${waypointsParam}&key=${this.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Directions API returned HTTP ${response.status}`);
      }
      const data = (await response.json()) as {
        status: string;
        routes?: Array<{
          overview_polyline?: { points: string };
          legs?: Array<{ distance?: { value: number }; duration?: { value: number } }>;
        }>;
      };

      if (data.status !== 'OK' || !data.routes || !data.routes[0]) {
        return this.fallbackProvider.calculateRoute(pickup, stops);
      }

      const route = data.routes[0];
      const encodedPolyline = route.overview_polyline?.points || '';
      let totalMeters = 0;
      let totalSeconds = 0;
      const legs: RouteLeg[] = [];

      let currentStart = pickup;
      for (let i = 0; i < (route.legs || []).length; i++) {
        const leg = route.legs![i]!;
        const meters = leg.distance?.value || 0;
        const seconds = leg.duration?.value || 0;
        totalMeters += meters;
        totalSeconds += seconds;

        const legEnd = stops[i] || lastStop;
        legs.push({
          distanceKm: Number((meters / 1000).toFixed(2)),
          durationMinutes: Math.round(seconds / 60),
          startLocation: currentStart,
          endLocation: legEnd,
        });
        currentStart = legEnd;
      }

      return {
        distanceKm: Number((totalMeters / 1000).toFixed(2)),
        durationMinutes: Math.round(totalSeconds / 60),
        encodedPolyline,
        legs,
      };
    } catch {
      return this.fallbackProvider.calculateRoute(pickup, stops);
    }
  }
}

let defaultMapsProvider: IMapsProvider | null = null;

export function getMapsProvider(): IMapsProvider {
  if (!defaultMapsProvider) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      defaultMapsProvider = new GoogleMapsProvider(apiKey.trim());
    } else {
      defaultMapsProvider = new OfflineMapsProvider();
    }
  }
  return defaultMapsProvider;
}

