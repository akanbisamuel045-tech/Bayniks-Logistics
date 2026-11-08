import { z } from 'zod';

/**
 * Standard named coordinate object used across REST API, WebSockets, and UI layers.
 * Order: { lat, lng }
 */
export const LatLngSchema = z.object({
  lat: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
  lng: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
});
export type LatLng = z.infer<typeof LatLngSchema>;

/**
 * MongoDB GeoJSON Point representation.
 * STRICT CRITICAL RULE 4: GeoJSON coordinates are ALWAYS [longitude, latitude].
 */
export const GeoJsonPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([
    z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'), // Longitude
    z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),       // Latitude
  ]),
});
export type GeoJsonPoint = z.infer<typeof GeoJsonPointSchema>;

/**
 * Converts named LatLng ({ lat, lng }) into MongoDB GeoJSON Point ({ type: 'Point', coordinates: [lng, lat] }).
 * Enforces validation and strict [longitude, latitude] ordering.
 */
export function toGeoJsonPoint(coords: LatLng): GeoJsonPoint {
  const validated = LatLngSchema.parse(coords);
  return {
    type: 'Point',
    coordinates: [validated.lng, validated.lat],
  };
}

/**
 * Converts MongoDB GeoJSON Point ({ type: 'Point', coordinates: [lng, lat] }) into named LatLng ({ lat, lng }).
 * Enforces validation and extracts [longitude, latitude] into { lat, lng }.
 */
export function fromGeoJsonPoint(point: GeoJsonPoint): LatLng {
  const validated = GeoJsonPointSchema.parse(point);
  return {
    lat: validated.coordinates[1],
    lng: validated.coordinates[0],
  };
}

/**
 * Encodes array of { lat, lng } points into standard Google Polyline string.
 */
export function encodeGooglePolyline(points: LatLng[]): string {
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

    let sgnLat = dLat < 0 ? ~(dLat << 1) : dLat << 1;
    while (sgnLat >= 0x20) {
      encoded += String.fromCharCode((0x20 | (sgnLat & 0x1f)) + 63);
      sgnLat >>= 5;
    }
    encoded += String.fromCharCode(sgnLat + 63);

    let sgnLng = dLng < 0 ? ~(dLng << 1) : dLng << 1;
    while (sgnLng >= 0x20) {
      encoded += String.fromCharCode((0x20 | (sgnLng & 0x1f)) + 63);
      sgnLng >>= 5;
    }
    encoded += String.fromCharCode(sgnLng + 63);
  }

  return encoded;
}

/**
 * Decodes a Google Encoded Polyline string into an array of { lat, lng } points.
 */
export function decodeGooglePolyline(encoded: string): LatLng[] {
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
