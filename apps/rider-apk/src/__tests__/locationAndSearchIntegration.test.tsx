// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DestinationModeSheet } from '../components/sheets/DestinationModeSheet';
import { RiderCockpitMapHome } from '../components/RiderCockpitMapHome';
import { useRiderStore } from '../store/riderStore';
import { searchMapLocations } from '../utils/locationSearch';

vi.mock('../utils/audioChimes', () => ({
  playKeypadChime: vi.fn(),
  playMissionAcceptChime: vi.fn(),
  playSuccessChime: vi.fn(),
  playAlertChime: vi.fn(),
}));

describe('Home/Favourite Addresses, Real GPS Location, and Map Search', () => {
  const originalGeolocation = navigator.geolocation;

  afterEach(() => {
    cleanup();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation,
    });
  });

  beforeEach(() => {
    act(() => {
      useRiderStore.setState({
        isLoggedIn: true,
        riderStatus: 'offline',
        tripPhase: 'idle',
        activeOrder: null,
        incomingOffer: null,
        currentLocation: { lat: 6.5933, lng: 3.3421 },
        toastMessage: null,
      });
    });
  });

  it('shows Maryland, Ikeja, Lagos for Home and Ikeja, Computer Village, Lagos for Favourite', () => {
    const onSelect = vi.fn();
    render(
      <DestinationModeSheet
        isOpen={true}
        onClose={vi.fn()}
        onSelectDestination={onSelect}
      />
    );

    expect(screen.getByText('Home')).toBeDefined();
    expect(screen.getByText('Maryland, Ikeja, Lagos')).toBeDefined();
    expect(screen.getByText('Favourite')).toBeDefined();
    expect(screen.getByText('Ikeja, Computer Village, Lagos')).toBeDefined();

    fireEvent.click(screen.getByText('Maryland, Ikeja, Lagos'));
    expect(onSelect).toHaveBeenCalledWith('Maryland, Ikeja, Lagos');
  });

  it('syncs currentLocation from real device geolocation and renders top-right Search icon instead of SCAN', async () => {
    const mockGeo = {
      getCurrentPosition: vi.fn((success: PositionCallback) => {
        success({
          coords: {
            latitude: 6.5718,
            longitude: 3.3666,
            accuracy: 12,
            heading: 45,
            speed: 4,
            altitude: null,
            altitudeAccuracy: null,
            toJSON: () => ({}),
          },
          timestamp: Date.now(),
          toJSON: () => ({}),
        } as GeolocationPosition);
      }),
      watchPosition: vi.fn(() => 1),
      clearWatch: vi.fn(),
    };

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: mockGeo,
    });

    render(
      <RiderCockpitMapHome
        onOpenDrawer={vi.fn()}
        onOpenSafety={vi.fn()}
        onOpenFullMap={vi.fn()}
        onOpenEarnings={vi.fn()}
        onOpenScheduledOrders={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(useRiderStore.getState().currentLocation).toEqual({
        lat: 6.5718,
        lng: 3.3666,
      });
    });

    // SCAN replaced by Search button
    expect(screen.queryByText(/^SCAN$/i)).toBeNull();
    const searchBtn = screen.getByTestId('home-map-search-btn');
    expect(searchBtn).toBeDefined();

    // Open search sheet & select Favourite location
    fireEvent.click(searchBtn);
    expect(screen.getByTestId('map-location-search-sheet')).toBeDefined();
    expect(screen.getByText('Maryland, Ikeja, Lagos')).toBeDefined();
    expect(screen.getByText('Ikeja, Computer Village, Lagos')).toBeDefined();

    fireEvent.click(screen.getByTestId('map-search-result-fav'));
    expect(screen.getByTestId('searched-location-pill').textContent).toContain(
      'Ikeja, Computer Village, Lagos'
    );
  });

  it('searches locations dynamically with Nominatim and merges Nigeria matches', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          place_id: 9911,
          name: 'Allen Avenue',
          display_name: 'Allen Avenue, Ikeja, Lagos, Nigeria',
          lat: '6.6018',
          lon: '3.3515',
        },
      ],
    }) as any;

    const results = await searchMapLocations('Allen');
    expect(results.some((r) => r.address.includes('Allen Avenue, Ikeja'))).toBe(true);

    globalThis.fetch = origFetch;
  });
});
