// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BayniksLiveMap } from '../components/map/BayniksLiveMap';
import { RiderCockpitMapHome } from '../components/RiderCockpitMapHome';
import { FullMapScreen } from '../components/FullMapScreen';
import { RiderSettingsScreen } from '../components/RiderSettingsScreen';
import { useRiderStore } from '../store/riderStore';
import {
  buildFallbackRoutePath,
  buildRadarCircleCoordinates,
  fetchRoadRoute,
  toLngLatArray,
} from '../utils/routeGeometry';

vi.mock('../utils/audioChimes', () => ({
  playKeypadChime: vi.fn(),
  playMissionAcceptChime: vi.fn(),
  playSuccessChime: vi.fn(),
  playAlertChime: vi.fn(),
}));

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-google-api-provider">{children}</div>
  ),
  Map: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-google-map-canvas">{children}</div>
  ),
  useMap: () => null,
}));

describe('Dual Real Map Integration (#1 Google Maps + #2 MapLibre GL JS)', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    act(() => {
      useRiderStore.setState({
        isLoggedIn: true,
        riderStatus: 'available',
        tripPhase: 'idle',
        activeOrder: null,
        incomingOffer: null,
        preferredMapEngine: 'google',
        currentLocation: { lat: 6.5933, lng: 3.3421 },
        toastMessage: null,
      });
    });
  });

  it('strictly converts { lat, lng } to GeoJSON [lng, lat] and builds closed radar ring + OSRM route', async () => {
    expect(toLngLatArray({ lat: 6.5933, lng: 3.3421 })).toEqual([3.3421, 6.5933]);

    const ring = buildRadarCircleCoordinates({ lat: 6.5933, lng: 3.3421 }, 2, 24);
    expect(ring.length).toBe(25);
    expect(ring[0]).toEqual(ring[24]);
    expect(ring[0]![0]).toBeCloseTo(3.3421, 1);

    const fallback = buildFallbackRoutePath(
      { lat: 6.5933, lng: 3.3421 },
      { lat: 6.5655, lng: 3.368 }
    );
    expect(fallback.length).toBe(5);
    expect(fallback[0]).toEqual({ lat: 6.5933, lng: 3.3421 });

    // Mock OSRM API returning [lng, lat] polyline coordinates
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 'Ok',
        routes: [
          {
            geometry: {
              coordinates: [
                [3.35, 6.59],
                [3.36, 6.58],
              ],
            },
          },
        ],
      }),
    }) as any;

    const osrmRoute = await fetchRoadRoute(
      { lat: 6.59, lng: 3.35 },
      { lat: 6.58, lng: 3.36 }
    );
    expect(osrmRoute).toEqual([
      { lat: 6.59, lng: 3.35 },
      { lat: 6.58, lng: 3.36 },
    ]);

    globalThis.fetch = origFetch;
  });

  it('uses Google Maps (#1) when key is present, and seamlessly falls back to MapLibre (#2) when absent or toggled', () => {
    const { rerender } = render(
      <BayniksLiveMap
        riderLocation={{ lat: 6.5933, lng: 3.3421 }}
        googleApiKeyOverride="AIzaSyFakeTestKeyForUnitSpec"
      />
    );

    expect(screen.getByTestId('bayniks-live-map').getAttribute('data-map-engine')).toBe('google');
    expect(screen.getByTestId('mock-google-map-canvas')).toBeDefined();

    // Switching store to MapLibre (#2) immediately renders MapLibre canvas
    act(() => {
      useRiderStore.getState().setPreferredMapEngine('maplibre');
    });
    rerender(
      <BayniksLiveMap
        riderLocation={{ lat: 6.5933, lng: 3.3421 }}
        googleApiKeyOverride="AIzaSyFakeTestKeyForUnitSpec"
      />
    );

    expect(screen.getByTestId('bayniks-live-map').getAttribute('data-map-engine')).toBe('maplibre');
    expect(screen.getByTestId('maplibre-headless-fallback')).toBeDefined();

    // Even with preferredMapEngine='google', empty key fails over safely to MapLibre (#2)
    act(() => {
      useRiderStore.getState().setPreferredMapEngine('google');
    });
    rerender(
      <BayniksLiveMap
        riderLocation={{ lat: 6.5933, lng: 3.3421 }}
        googleApiKeyOverride=""
      />
    );

    expect(screen.getByTestId('bayniks-live-map').getAttribute('data-map-engine')).toBe('maplibre');
  });

  it('wires dual-engine map & engine switchers across Cockpit, FullMapScreen, and Navigation Settings', () => {
    render(
      <RiderCockpitMapHome
        onOpenDrawer={vi.fn()}
        onOpenSafety={vi.fn()}
        onOpenFullMap={vi.fn()}
        onOpenEarnings={vi.fn()}
        onOpenScheduledOrders={vi.fn()}
      />
    );

    expect(screen.getByTestId('cockpit-live-map')).toBeDefined();
    fireEvent.click(screen.getByTestId('cockpit-map-engine-pill'));
    expect(useRiderStore.getState().preferredMapEngine).toBe('maplibre');

    cleanup();

    render(<FullMapScreen isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('full-map-live-canvas')).toBeDefined();
    fireEvent.click(screen.getByTestId('full-map-engine-toggle'));
    expect(useRiderStore.getState().preferredMapEngine).toBe('google');

    cleanup();

    render(<RiderSettingsScreen onOpenKyc={vi.fn()} onOpenSupport={vi.fn()} />);
    fireEvent.click(screen.getByTestId('settings-navigation-row'));
    const engineRow = screen.getByTestId('settings-map-engine-row');
    expect(engineRow.textContent).toContain('Google Maps (#1 Primary)');
    fireEvent.click(engineRow);
    expect(useRiderStore.getState().preferredMapEngine).toBe('maplibre');
    expect(screen.getByTestId('settings-map-engine-row').textContent).toContain('MapLibre Vector (#2 Open-Source)');
  });
});

