import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { APIProvider, Map as GoogleMap, useMap } from '@vis.gl/react-google-maps';
import { useRiderStore } from '../../store/riderStore';
import {
  BAYNIKS_GOOGLE_LIGHT_STYLE,
  buildFallbackRoutePath,
  buildRadarCircleCoordinates,
  OSM_FALLBACK_STYLE,
  fetchRoadRoute,
  LatLng,
  OPENFREEMAP_POSITRON_STYLE_URL,
  toLngLatArray,
} from '../../utils/routeGeometry';

export interface BayniksLiveMapProps {
  riderLocation: LatLng;
  riderBearing?: number;
  riderLabel?: string;
  pickupLocation?: LatLng;
  pickupLabel?: string;
  dropoffLocation?: LatLng;
  dropoffLabel?: string;
  routeOrigin?: LatLng;
  routeTarget?: LatLng;
  showRadar?: boolean;
  radarRadiusKm?: number;
  showSurgeZones?: boolean;
  zoom?: number;
  pitch?: number;
  interactive?: boolean;
  recenterNonce?: number;
  fitRouteBounds?: boolean;
  googleApiKeyOverride?: string;
  className?: string;
  testId?: string;
}

const SURGE_ZONES: Array<{ id: string; label: string; location: LatLng }> = [
  { id: 'yaba', label: 'Yaba 1.4x', location: { lat: 6.5158, lng: 3.3718 } },
  { id: 'ikeja', label: 'Ikeja 1.2x', location: { lat: 6.6018, lng: 3.3515 } },
  { id: 'vi', label: 'VI 1.5x', location: { lat: 6.4281, lng: 3.4219 } },
];

/** Safely probes browser WebGL availability without crashing JSDOM unit tests. */
function hasWebGLSupport(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '')) {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Builds clean HTML DOM pin element for MapLibre bike/pickup/dropoff markers. */
function createMarkerElement(
  kind: 'bike' | 'pickup' | 'dropoff' | 'surge',
  label?: string,
  bearing = 0
): HTMLDivElement {
  const el = document.createElement('div');
  el.style.pointerEvents = 'none';

  if (kind === 'bike') {
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="transform:rotate(${Math.round(bearing)}deg);width:34px;height:34px;border-radius:10px;background:#18181B;border:2px solid #FF5722;box-shadow:0 4px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#FF5722;font-weight:900;font-size:13px;font-family:sans-serif;">
          B
        </div>
        ${
          label
            ? `<span style="margin-top:4px;background:#18181B;color:#FFFFFF;font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);">${label}</span>`
            : ''
        }
      </div>
    `;
    return el;
  }

  if (kind === 'pickup') {
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:5px;">
        <span style="width:16px;height:16px;border-radius:999px;background:#18181B;border:3px solid #FFFFFF;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:block;"></span>
        ${
          label
            ? `<span style="background:#FFFFFF;color:#18181B;font-size:10px;font-weight:700;padding:2px 6px;border-radius:6px;border:1px solid #E4E4E7;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.12);">${label}</span>`
            : ''
        }
      </div>
    `;
    return el;
  }

  if (kind === 'dropoff') {
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:5px;">
        <span style="width:18px;height:18px;border-radius:999px;background:#FF5722;border:3px solid #FFFFFF;box-shadow:0 2px 8px rgba(255,87,34,0.45);display:block;"></span>
        ${
          label
            ? `<span style="background:#18181B;color:#FFFFFF;font-size:10px;font-weight:700;padding:2px 6px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2);">${label}</span>`
            : ''
        }
      </div>
    `;
    return el;
  }

  el.innerHTML = `
    <span style="background:#18181B;color:#FF5722;border:1px solid #FF5722;font-size:10px;font-weight:800;padding:3px 8px;border-radius:999px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25);">
      ${label || 'Surge'}
    </span>
  `;
  return el;
}

/** Google Maps Imperative Overlay syncing Polyline, Radar Circle, and Markers to `useMap()`. */
const GoogleMapsOverlays: React.FC<{
  riderLocation: LatLng;
  pickupLocation?: LatLng;
  dropoffLocation?: LatLng;
  routePath: LatLng[];
  showRadar: boolean;
  radarRadiusKm: number;
  zoom: number;
  recenterNonce: number;
  fitRouteBounds: boolean;
}> = ({
  riderLocation,
  pickupLocation,
  dropoffLocation,
  routePath,
  showRadar,
  radarRadiusKm,
  zoom,
  recenterNonce,
  fitRouteBounds,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;
    const markers: google.maps.Marker[] = [];

    markers.push(
      new google.maps.Marker({
        map,
        position: riderLocation,
        title: 'Dispatch Rider',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#18181B',
          fillOpacity: 1,
          strokeColor: '#FF5722',
          strokeWeight: 3,
        },
      })
    );

    if (pickupLocation) {
      markers.push(
        new google.maps.Marker({
          map,
          position: pickupLocation,
          title: 'Pickup',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: '#18181B',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
        })
      );
    }

    if (dropoffLocation) {
      markers.push(
        new google.maps.Marker({
          map,
          position: dropoffLocation,
          title: 'Dropoff',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#FF5722',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
        })
      );
    }

    let casingLine: google.maps.Polyline | null = null;
    let routeLine: google.maps.Polyline | null = null;
    if (routePath.length >= 2) {
      casingLine = new google.maps.Polyline({
        map,
        path: routePath,
        strokeColor: '#18181B',
        strokeWeight: 7,
        strokeOpacity: 0.92,
      });
      routeLine = new google.maps.Polyline({
        map,
        path: routePath,
        strokeColor: '#FF5722',
        strokeWeight: 3.5,
        strokeOpacity: 1,
      });
    }

    let radarCircle: google.maps.Circle | null = null;
    if (showRadar) {
      radarCircle = new google.maps.Circle({
        map,
        center: riderLocation,
        radius: radarRadiusKm * 1000,
        fillColor: '#FF5722',
        fillOpacity: 0.12,
        strokeColor: '#18181B',
        strokeWeight: 1.5,
        strokeOpacity: 0.65,
      });
    }

    return () => {
      markers.forEach((m) => m.setMap(null));
      casingLine?.setMap(null);
      routeLine?.setMap(null);
      radarCircle?.setMap(null);
    };
  }, [map, riderLocation, pickupLocation, dropoffLocation, routePath, showRadar, radarRadiusKm]);

  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;
    if (fitRouteBounds && routePath.length >= 2) {
      const bounds = new google.maps.LatLngBounds();
      routePath.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, 42);
    } else {
      map.panTo(riderLocation);
      map.setZoom(zoom);
    }
  }, [map, riderLocation, zoom, recenterNonce, fitRouteBounds, routePath]);

  return null;
};

/** Interactive MapLibre GL JS Vector Map Renderer (Engine #2). */
const MapLibreVectorCanvas: React.FC<{
  riderLocation: LatLng;
  riderBearing: number;
  riderLabel?: string;
  pickupLocation?: LatLng;
  pickupLabel?: string;
  dropoffLocation?: LatLng;
  dropoffLabel?: string;
  routePath: LatLng[];
  showRadar: boolean;
  radarRadiusKm: number;
  showSurgeZones: boolean;
  zoom: number;
  pitch: number;
  interactive: boolean;
  recenterNonce: number;
  fitRouteBounds: boolean;
}> = ({
  riderLocation,
  riderBearing,
  riderLabel,
  pickupLocation,
  pickupLabel,
  dropoffLocation,
  dropoffLabel,
  routePath,
  showRadar,
  radarRadiusKm,
  showSurgeZones,
  zoom,
  pitch,
  interactive,
  recenterNonce,
  fitRouteBounds,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [styleReady, setStyleReady] = useState(false);

  const webGLAvailable = useMemo(() => hasWebGLSupport(), []);

  useEffect(() => {
    if (!webGLAvailable || !containerRef.current) return;

    let fellBackToOsm = false;
    let isDisposed = false;
    let loaded = false;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_POSITRON_STYLE_URL,
      center: toLngLatArray(riderLocation),
      zoom,
      pitch,
      bearing: pitch > 0 ? riderBearing : 0,
      interactive,
      attributionControl: false,
    });

    map.on('style.load', () => {
      if (isDisposed) return;
      loaded = true;
      setStyleReady(true);
    });

    // Guard fallback timer in case OpenFreeMap vector style stalls
    const fallbackTimer = setTimeout(() => {
      if (!loaded && !fellBackToOsm && !isDisposed) {
        fellBackToOsm = true;
        setStyleReady(false);
        try {
          map.setStyle(OSM_FALLBACK_STYLE);
        } catch {
          // Ignore teardown races
        }
      }
    }, 5500);

    map.on('error', (evt: any) => {
      if (isDisposed || fellBackToOsm || loaded) return;
      const status = evt?.error?.status;
      if (status && status >= 400 && evt?.sourceId === undefined) {
        fellBackToOsm = true;
        setStyleReady(false);
        try {
          map.setStyle(OSM_FALLBACK_STYLE);
        } catch {
          // Ignore teardown races
        }
      }
    });

    mapRef.current = map;

    return () => {
      isDisposed = true;
      clearTimeout(fallbackTimer);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      setStyleReady(false);
    };
  }, [webGLAvailable, interactive]);

  // Sync GeoJSON route & radar layers cleanly whenever data or style updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;

    const radarGeoJson = {
      type: 'FeatureCollection' as const,
      features: showRadar
        ? [
            {
              type: 'Feature' as const,
              properties: {},
              geometry: {
                type: 'Polygon' as const,
                coordinates: [buildRadarCircleCoordinates(riderLocation, radarRadiusKm)],
              },
            },
          ]
        : [],
    };

    const routeGeoJson = {
      type: 'FeatureCollection' as const,
      features:
        routePath.length >= 2
          ? [
              {
                type: 'Feature' as const,
                properties: {},
                geometry: {
                  type: 'LineString' as const,
                  coordinates: routePath.map(toLngLatArray),
                },
              },
            ]
          : [],
    };

    const upsertSourceAndLayers = () => {
      const radarSource = map.getSource('bayniks-radar') as maplibregl.GeoJSONSource | undefined;
      if (radarSource) {
        radarSource.setData(radarGeoJson);
      } else {
        map.addSource('bayniks-radar', { type: 'geojson', data: radarGeoJson });
        map.addLayer({
          id: 'bayniks-radar-fill',
          type: 'fill',
          source: 'bayniks-radar',
          paint: { 'fill-color': '#FF5722', 'fill-opacity': 0.12 },
        });
        map.addLayer({
          id: 'bayniks-radar-outline',
          type: 'line',
          source: 'bayniks-radar',
          paint: {
            'line-color': '#18181B',
            'line-width': 1.6,
            'line-dasharray': [4, 3],
            'line-opacity': 0.65,
          },
        });
      }

      const routeSource = map.getSource('bayniks-route') as maplibregl.GeoJSONSource | undefined;
      if (routeSource) {
        routeSource.setData(routeGeoJson);
      } else {
        map.addSource('bayniks-route', { type: 'geojson', data: routeGeoJson });
        map.addLayer({
          id: 'bayniks-route-casing',
          type: 'line',
          source: 'bayniks-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#18181B', 'line-width': 7.5 },
        });
        map.addLayer({
          id: 'bayniks-route-line',
          type: 'line',
          source: 'bayniks-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#FF5722', 'line-width': 3.5 },
        });
      }
    };

    try {
      upsertSourceAndLayers();
    } catch {
      // Style transition timing guard
    }
  }, [styleReady, riderLocation, radarRadiusKm, showRadar, routePath]);

  // Sync DOM markers cleanly
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const nextMarkers: maplibregl.Marker[] = [];

    nextMarkers.push(
      new maplibregl.Marker({
        element: createMarkerElement('bike', riderLabel, riderBearing),
        anchor: 'center',
      })
        .setLngLat(toLngLatArray(riderLocation))
        .addTo(map)
    );

    if (pickupLocation) {
      nextMarkers.push(
        new maplibregl.Marker({
          element: createMarkerElement('pickup', pickupLabel),
          anchor: 'center',
        })
          .setLngLat(toLngLatArray(pickupLocation))
          .addTo(map)
      );
    }

    if (dropoffLocation) {
      nextMarkers.push(
        new maplibregl.Marker({
          element: createMarkerElement('dropoff', dropoffLabel),
          anchor: 'center',
        })
          .setLngLat(toLngLatArray(dropoffLocation))
          .addTo(map)
      );
    }

    if (showSurgeZones) {
      SURGE_ZONES.forEach((zone) => {
        nextMarkers.push(
          new maplibregl.Marker({
            element: createMarkerElement('surge', zone.label),
            anchor: 'center',
          })
            .setLngLat(toLngLatArray(zone.location))
            .addTo(map)
        );
      });
    }

    markersRef.current = nextMarkers;
  }, [
    webGLAvailable,
    riderLocation,
    riderBearing,
    riderLabel,
    pickupLocation,
    pickupLabel,
    dropoffLocation,
    dropoffLabel,
    showSurgeZones,
  ]);

  // Sync camera center / zoom / fitBounds cleanly
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      if (fitRouteBounds && routePath.length >= 2) {
        const bounds = new maplibregl.LngLatBounds();
        routePath.forEach((pt) => bounds.extend(toLngLatArray(pt)));
        map.fitBounds(bounds, { padding: 42, duration: 400 });
      } else {
        map.easeTo({
          center: toLngLatArray(riderLocation),
          zoom,
          pitch,
          bearing: pitch > 0 ? riderBearing : 0,
          duration: 350,
        });
      }
    } catch {
      // Camera resize guard
    }
  }, [riderLocation, zoom, pitch, riderBearing, recenterNonce, fitRouteBounds, routePath]);

  if (!webGLAvailable) {
    return (
      <div
        className="w-full h-full bg-[#F2F3F5] relative overflow-hidden"
        data-testid="maplibre-headless-fallback"
      >
        <svg viewBox="0 0 400 260" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <rect width="400" height="260" fill="#F2F3F5" />
          <path d="M0 70 L400 60 M0 150 L400 140 M110 0 L100 260 M280 0 L265 260" stroke="#FFFFFF" strokeWidth="10" />
          {showRadar && (
            <circle cx="200" cy="130" r="64" fill="rgba(255,87,34,0.12)" stroke="#18181B" strokeWidth="1.5" strokeDasharray="5 4" />
          )}
          {routePath.length >= 2 && (
            <>
              <path d="M 110 175 Q 200 135 290 75" stroke="#18181B" strokeWidth="7" strokeLinecap="round" fill="none" />
              <path d="M 110 175 Q 200 135 290 75" stroke="#FF5722" strokeWidth="3" strokeLinecap="round" fill="none" />
            </>
          )}
          <circle cx="200" cy="130" r="10" fill="#18181B" stroke="#FF5722" strokeWidth="2.5" />
          {pickupLocation && <circle cx="110" cy="175" r="7" fill="#18181B" stroke="#FFFFFF" strokeWidth="2" />}
          {dropoffLocation && <circle cx="290" cy="75" r="8" fill="#FF5722" stroke="#FFFFFF" strokeWidth="2" />}
        </svg>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" data-testid="maplibre-webgl-canvas" />;
};

export const BayniksLiveMap: React.FC<BayniksLiveMapProps> = ({
  riderLocation,
  riderBearing = 0,
  riderLabel,
  pickupLocation,
  pickupLabel,
  dropoffLocation,
  dropoffLabel,
  routeOrigin,
  routeTarget,
  showRadar = false,
  radarRadiusKm = 2,
  showSurgeZones = false,
  zoom = 14,
  pitch = 0,
  interactive = true,
  recenterNonce = 0,
  fitRouteBounds = false,
  googleApiKeyOverride,
  className = '',
  testId = 'bayniks-live-map',
}) => {
  const { preferredMapEngine } = useRiderStore();
  const [googleAuthFailed, setGoogleAuthFailed] = useState(false);

  const envApiKey = ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  const googleApiKey = (googleApiKeyOverride ?? envApiKey).trim();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prevAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      setGoogleAuthFailed(true);
      if (typeof prevAuthFailure === 'function') prevAuthFailure();
    };
    return () => {
      (window as any).gm_authFailure = prevAuthFailure;
    };
  }, []);

  const canUseGoogle = preferredMapEngine === 'google' && Boolean(googleApiKey) && !googleAuthFailed;
  const activeEngine: 'google' | 'maplibre' = canUseGoogle ? 'google' : 'maplibre';

  const resolvedOrigin = routeOrigin || pickupLocation || riderLocation;
  const resolvedTarget = routeTarget || dropoffLocation || pickupLocation;

  const [routePath, setRoutePath] = useState<LatLng[]>(() =>
    resolvedTarget ? buildFallbackRoutePath(resolvedOrigin, resolvedTarget) : []
  );

  useEffect(() => {
    if (!resolvedTarget) {
      setRoutePath([]);
      return;
    }

    let cancelled = false;
    setRoutePath(buildFallbackRoutePath(resolvedOrigin, resolvedTarget));

    fetchRoadRoute(resolvedOrigin, resolvedTarget).then((points) => {
      if (!cancelled) {
        setRoutePath(points);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    resolvedOrigin.lat,
    resolvedOrigin.lng,
    resolvedTarget?.lat,
    resolvedTarget?.lng,
  ]);

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-[#F2F3F5] ${className}`}
      data-testid={testId}
      data-map-engine={activeEngine}
      data-google-configured={Boolean(googleApiKey)}
    >
      {activeEngine === 'google' ? (
        <APIProvider apiKey={googleApiKey} onError={() => setGoogleAuthFailed(true)}>
          <GoogleMap
            defaultCenter={riderLocation}
            defaultZoom={zoom}
            gestureHandling={interactive ? 'greedy' : 'none'}
            disableDefaultUI={true}
            styles={BAYNIKS_GOOGLE_LIGHT_STYLE as any}
            className="w-full h-full"
          >
            <GoogleMapsOverlays
              riderLocation={riderLocation}
              pickupLocation={pickupLocation}
              dropoffLocation={dropoffLocation}
              routePath={routePath}
              showRadar={showRadar}
              radarRadiusKm={radarRadiusKm}
              zoom={zoom}
              recenterNonce={recenterNonce}
              fitRouteBounds={fitRouteBounds}
            />
          </GoogleMap>
        </APIProvider>
      ) : (
        <MapLibreVectorCanvas
          riderLocation={riderLocation}
          riderBearing={riderBearing}
          riderLabel={riderLabel}
          pickupLocation={pickupLocation}
          pickupLabel={pickupLabel}
          dropoffLocation={dropoffLocation}
          dropoffLabel={dropoffLabel}
          routePath={routePath}
          showRadar={showRadar}
          radarRadiusKm={radarRadiusKm}
          showSurgeZones={showSurgeZones}
          zoom={zoom}
          pitch={pitch}
          interactive={interactive}
          recenterNonce={recenterNonce}
          fitRouteBounds={fitRouteBounds}
        />
      )}
    </div>
  );
};

export default BayniksLiveMap;
