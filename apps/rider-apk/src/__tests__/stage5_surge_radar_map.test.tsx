// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NearbySurgeRadar } from '../components/NearbySurgeRadar';
import { FullMapScreen } from '../components/FullMapScreen';
import { useRiderStore } from '../store/riderStore';

describe('Stage 5: Nearby Surge Radar & Edge-to-Edge Full-View Lagos Map', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useRiderStore.setState({
      riderStatus: 'available',
      tripPhase: 'idle',
      activeOrder: null,
      toastMessage: null,
    });
  });

  describe('NearbySurgeRadar Component', () => {
    it('renders the surge zones header, active corridor, and full map button', () => {
      const handleOpenFullMap = vi.fn();
      render(<NearbySurgeRadar onOpenFullMap={handleOpenFullMap} />);

      expect(screen.getByText(/NEARBY DELIVERY ZONES/i)).toBeDefined();
      expect(screen.getByText(/Yaba Tech Hub/i)).toBeDefined();
      expect(screen.getByText(/1.4x Active/i)).toBeDefined();

      const fullMapBtn = screen.getByTestId('surge-radar-fullmap-btn');
      expect(fullMapBtn).toBeDefined();
      fireEvent.click(fullMapBtn);
      expect(handleOpenFullMap).toHaveBeenCalledTimes(1);
    });

    it('renders 3 surge hub pins (Yaba, Ikeja, VI) and GPS locked footer', () => {
      const handleTrigger = vi.fn();
      render(<NearbySurgeRadar onOpenFullMap={vi.fn()} onTriggerSurgeDispatch={handleTrigger} />);

      expect(screen.getByTestId('hub-pin-yaba').textContent).toContain('Yaba Tech • 1.4x');
      expect(screen.getByTestId('hub-pin-ikeja').textContent).toContain('Ikeja • 1.2x');
      expect(screen.getByTestId('hub-pin-vi').textContent).toContain('VI Towers • 1.5x');
      expect(screen.getByTestId('rider-gps-puck')).toBeDefined();

      expect(screen.getByText(/Commercial Ave, Yaba/i)).toBeDefined();
      expect(screen.getByText(/GPS Locked/i)).toBeDefined();

      fireEvent.click(screen.getByTestId('hub-pin-yaba'));
      expect(handleTrigger).toHaveBeenCalledTimes(1);
      expect(useRiderStore.getState().toastMessage).toContain('Yaba Tech Hub');
    });
  });

  describe('FullMapScreen Component', () => {
    it('does not render when isOpen is false', () => {
      render(<FullMapScreen isOpen={false} onClose={vi.fn()} />);
      expect(screen.queryByTestId('full-map-screen')).toBeNull();
    });

    it('renders top bar with back button, live GPS badge, and map controls when open', () => {
      const handleClose = vi.fn();
      render(<FullMapScreen isOpen={true} onClose={handleClose} />);

      expect(screen.getByTestId('full-map-screen')).toBeDefined();
      expect(screen.getByText(/Yaba • Lagos Mainland/i)).toBeDefined();
      expect(screen.getByText(/4.0 km Corridor Radar/i)).toBeDefined();
      expect(screen.getByTestId('full-map-gps-badge').textContent).toContain('LIVE GPS');

      // Controls
      expect(screen.getByTestId('full-map-zoom-in')).toBeDefined();
      expect(screen.getByTestId('full-map-zoom-out')).toBeDefined();
      expect(screen.getByTestId('full-map-recenter-btn')).toBeDefined();
      expect(screen.getByTestId('full-map-surge-toggle')).toBeDefined();

      // Rider Puck
      expect(screen.getByTestId('full-map-rider-puck').textContent).toContain('Joseph Okon • BLT-4912');

      // Close action
      const backBtn = screen.getByTestId('full-map-back-btn');
      fireEvent.click(backBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('toggles surge hotspot layer on FAB click', () => {
      render(<FullMapScreen isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByTestId('full-map-surge-layer')).toBeDefined();
      const surgeToggle = screen.getByTestId('full-map-surge-toggle');
      fireEvent.click(surgeToggle);

      expect(screen.queryByTestId('full-map-surge-layer')).toBeNull();
      expect(useRiderStore.getState().toastMessage).toBe('Surge hotspots hidden');

      fireEvent.click(surgeToggle);
      expect(screen.getByTestId('full-map-surge-layer')).toBeDefined();
      expect(useRiderStore.getState().toastMessage).toBe('Surge hotspots visible');
    });

    it('renders collapsible bottom card and toggles minimization', () => {
      render(<FullMapScreen isOpen={true} onClose={vi.fn()} />);

      const bottomCard = screen.getByTestId('full-map-bottom-card');
      expect(bottomCard).toBeDefined();
      expect(bottomCard.classList.contains('minimized')).toBe(false);
      expect(screen.getByText(/1.4x Surge Active/i)).toBeDefined();

      const collapseBtn = screen.getByTestId('full-map-collapse-btn');
      fireEvent.click(collapseBtn);

      expect(bottomCard.classList.contains('minimized')).toBe(true);
      expect(screen.queryByTestId('full-map-standby-cta')).toBeNull();

      fireEvent.click(collapseBtn);
      expect(bottomCard.classList.contains('minimized')).toBe(false);
      expect(screen.getByTestId('full-map-standby-cta')).toBeDefined();
    });

    it('displays active delivery route polyline, route pins, and mission step actions when on mission', () => {
      useRiderStore.setState({
        riderStatus: 'busy',
        tripPhase: 'arriving_pickup',
        activeOrder: {
          _id: 'ord-test-48291',
          trackingCode: '#BF-48291',
          status: 'rider_assigned',
          vehicleType: 'bike',
          paymentMethod: 'wallet',
          totalFareKobo: 320000,
          riderEarningKobo: 256000,
          estimatedDistanceKm: 4.8,
          pickup: {
            address: 'Kuchi Empire, Yaba, Lagos',
            landmark: 'Beside Tech Hub',
            location: { lat: 6.5165, lng: 3.3855 },
            contactName: 'Kuchi Vendor',
            contactPhone: '+2348021112233',
          },
          stops: [
            {
              sequenceNumber: 1,
              recipientName: 'Victoria Island Towers Client',
              recipientPhone: '+2348034445566',
              dropoffAddress: 'Victoria Island Towers, Lagos',
              dropoffLandmark: 'Beside Civic Centre',
              dropoffLocation: { lat: 6.4281, lng: 3.4219 },
              packageDescription: 'Express Parcel',
              status: 'pending',
            },
          ],
        },
      });

      const handleOpenVerify = vi.fn();
      render(<FullMapScreen isOpen={true} onClose={vi.fn()} onOpenVerification={handleOpenVerify} />);

      expect(screen.getByTestId('full-map-route-group')).toBeDefined();
      expect(screen.getByTestId('full-map-route-pins')).toBeDefined();
      expect(screen.getByText(/#BF-48291 Live/i)).toBeDefined();
      expect(screen.getByText(/STEP 1 OF 4 • EN ROUTE TO PICKUP/i)).toBeDefined();

      const missionCta = screen.getByTestId('full-map-mission-cta');
      expect(missionCta.textContent).toContain('Arrived at Pickup →');

      fireEvent.click(missionCta);
      expect(useRiderStore.getState().tripPhase).toBe('at_pickup');
    });
  });
});
