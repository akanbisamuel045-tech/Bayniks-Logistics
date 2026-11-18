/**
 * External Navigation Deep-Linking Utility for Dispatch Riders
 * Provides deep-links to Google Maps (with two-wheeler motorcycle routing) and Waze.
 */

export interface NavigationTarget {
  lat: number;
  lng: number;
  address?: string;
  landmark?: string;
}

export type NavigationApp = 'google_maps' | 'waze' | 'apple_maps';

/**
 * Builds universal Google Maps Web / App URL with motorcycle / two-wheeler routing.
 */
export function buildGoogleMapsUrl(lat: number, lng: number, address?: string): string {
  const encodedAddress = address ? encodeURIComponent(address) : '';
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${
    encodedAddress ? `&destination_place_id=${encodedAddress}` : ''
  }&travelmode=two-wheeler`;
}

/**
 * Builds Waze Navigation Deep Link URL.
 */
export function buildWazeUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

/**
 * Opens Google Maps Navigation.
 * Uses Android 2-wheeler motorcycle mode (mode=2w) for optimal motorcycle lane routing in Lagos traffic.
 */
export function openGoogleMapsNavigation(lat: number, lng: number, address?: string): void {
  if (typeof window === 'undefined') return;

  const isAndroid = /android/i.test(navigator.userAgent || '');
  const webFallback = buildGoogleMapsUrl(lat, lng, address);

  if (isAndroid) {
    // Android Native Intent for Google Maps 2-Wheeler mode
    const androidIntent = `google.navigation:q=${lat},${lng}&mode=2w`;

    try {
      window.location.href = androidIntent;
      // Fallback timeout if native intent handler doesn't capture
      setTimeout(() => {
        window.open(webFallback, '_blank');
      }, 750);
    } catch {
      window.open(webFallback, '_blank');
    }
  } else {
    // Universal Web Google Maps Directions with two-wheeler / driving preference
    window.open(webFallback, '_blank');
  }
}

/**
 * Opens Waze Live Navigation for real-time traffic and hazard rerouting.
 */
export function openWazeNavigation(lat: number, lng: number): void {
  if (typeof window === 'undefined') return;

  const wazeNative = `waze://?ll=${lat},${lng}&navigate=yes`;
  const wazeWeb = buildWazeUrl(lat, lng);

  try {
    window.location.href = wazeNative;
    setTimeout(() => {
      window.open(wazeWeb, '_blank');
    }, 750);
  } catch {
    window.open(wazeWeb, '_blank');
  }
}

/**
 * Universal dispatcher to open chosen navigation application.
 */
export function openNavigationApp(app: NavigationApp, target: NavigationTarget): void {
  if (app === 'waze') {
    openWazeNavigation(target.lat, target.lng);
  } else if (app === 'apple_maps') {
    window.open(`maps://?daddr=${target.lat},${target.lng}&dirflg=d`, '_blank');
  } else {
    openGoogleMapsNavigation(target.lat, target.lng, target.address);
  }
}
