// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { CenterMissionCard } from '../components/CenterMissionCard';
import { MissionProgressBar } from '../components/MissionProgressBar';
import { useRiderStore } from '../store/riderStore';
import * as audioChimes from '../utils/audioChimes';

describe('Stage 4: Dynamic Center Mission Card (3 States & N=1 Lock)', () => {
  let playMissionAcceptChimeSpy: ReturnType<typeof vi.spyOn>;
  let playKeypadChimeSpy: ReturnType<typeof vi.spyOn>;
  let playErrorChimeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, val: string) => {
        store[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach((k) => delete store[k]);
      }),
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });

    playMissionAcceptChimeSpy = vi.spyOn(audioChimes, 'playMissionAcceptChime').mockImplementation(() => {});
    playKeypadChimeSpy = vi.spyOn(audioChimes, 'playKeypadChime').mockImplementation(() => {});
    playErrorChimeSpy = vi.spyOn(audioChimes, 'playErrorChime').mockImplementation(() => {});

    // Reset store state
    useRiderStore.setState({
      riderStatus: 'offline',
      tripPhase: 'idle',
      activeOrder: null,
      incomingOffer: null,
      toastMessage: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('1. State 1: Offline Standby Prompt', () => {
    it('renders State 1 card when rider is offline with Capacity 0/1 indicator', () => {
      render(<CenterMissionCard />);

      expect(screen.getByTestId('card-state-offline')).toBeDefined();
      expect(screen.queryByTestId('card-state-scanning')).toBeNull();
      expect(screen.queryByTestId('card-state-active-mission')).toBeNull();

      expect(screen.getByText('SHIFT DISPATCH STANDBY')).toBeDefined();
      expect(screen.getByText('Capacity 0/1')).toBeDefined();
      expect(screen.getByText('Go Online to start earning')).toBeDefined();
    });

    it('transitions to online when "Go Online & Find Deliveries" is clicked', async () => {
      render(<CenterMissionCard />);

      const goOnlineBtn = screen.getByTestId('btn-go-online');
      await act(async () => {
        fireEvent.click(goOnlineBtn);
      });

      expect(useRiderStore.getState().riderStatus).toBe('available');
      expect(playMissionAcceptChimeSpy).toHaveBeenCalled();
    });
  });

  describe('2. State 2: Online Radar Scanning / Idle', () => {
    beforeEach(() => {
      useRiderStore.setState({
        riderStatus: 'available',
        tripPhase: 'idle',
        activeOrder: null,
      });
    });

    it('renders State 2 card with ONLINE • SCANNING chip and corridor info', () => {
      render(<CenterMissionCard />);

      expect(screen.getByTestId('card-state-scanning')).toBeDefined();
      expect(screen.queryByTestId('card-state-offline')).toBeNull();
      expect(screen.queryByTestId('card-state-active-mission')).toBeNull();

      expect(screen.getByText(/ONLINE • SCANNING/i)).toBeDefined();
      expect(screen.getByText('Capacity: 0/1')).toBeDefined();
      expect(screen.getByText(/Scanning Yaba & VI corridor/i)).toBeDefined();
    });

    it('triggers test dispatch offer when "Simulate Dispatch ⚡" is tapped', () => {
      render(<CenterMissionCard />);

      const simulateBtn = screen.getByTestId('btn-simulate-dispatch');
      fireEvent.click(simulateBtn);

      expect(useRiderStore.getState().incomingOffer).not.toBeNull();
    });

    it('transitions back to offline when "Go Offline" is tapped', async () => {
      render(<CenterMissionCard />);

      const goOfflineBtn = screen.getByTestId('btn-go-offline');
      await act(async () => {
        fireEvent.click(goOfflineBtn);
      });

      expect(useRiderStore.getState().riderStatus).toBe('offline');
      expect(playKeypadChimeSpy).toHaveBeenCalled();
    });
  });

  describe('3. State 3: Active Mission Card & 4-Step Progression', () => {
    const mockOrder = {
      _id: 'ord-test-48291',
      trackingCode: '#BF-48291',
      status: 'rider_assigned',
      vehicleType: 'bike',
      paymentMethod: 'wallet',
      totalFareKobo: 380000,
      riderEarningKobo: 320000,
      estimatedDistanceKm: 6.2,
      pickup: {
        address: '14 Commercial Ave, Yaba',
        landmark: 'Near E-Center',
        location: { lat: 6.5165, lng: 3.3855 },
        contactName: 'Kuchi Empire',
        contactPhone: '+2348025550192',
      },
      stops: [
        {
          sequenceNumber: 1,
          recipientName: 'Sarah Jenkins',
          recipientPhone: '+2348093348821',
          dropoffAddress: 'Victoria Island Towers, Plot 4',
          dropoffLandmark: 'Beside Civic Centre',
          dropoffLocation: { lat: 6.4312, lng: 3.4256 },
          packageDescription: 'Sealed Electronics & Glassware (Medium Box)',
          status: 'pending',
        },
      ],
    };

    beforeEach(() => {
      useRiderStore.setState({
        riderStatus: 'busy',
        tripPhase: 'arriving_pickup',
        activeOrder: mockOrder,
      });
    });

    it('renders State 3 card with N=1 locked header, guaranteed pay, and pickup/dropoff breakdown', () => {
      render(<CenterMissionCard />);

      expect(screen.getByTestId('card-state-active-mission')).toBeDefined();
      expect(screen.getByText('ACTIVE MISSION (1/1 LOCKED)')).toBeDefined();
      expect(screen.getByTestId('mission-tracking-code').textContent).toBe('#BF-48291');
      expect(screen.getByTestId('mission-pay').textContent).toBe('₦3,200');

      // Pickup & Dropoff
      expect(screen.getByText('Kuchi Empire')).toBeDefined();
      expect(screen.getByText('14 Commercial Ave, Yaba')).toBeDefined();
      expect(screen.getByText('Sarah Jenkins')).toBeDefined();
      expect(screen.getByText('Victoria Island Towers, Plot 4')).toBeDefined();

      // Fragile package summary
      expect(screen.getByText('⚠️ FRAGILE')).toBeDefined();
      expect(screen.getByText('4.5 kg')).toBeDefined();
    });

    it('progresses through Step 1 (En Route to Pickup) with correct button label', async () => {
      render(<CenterMissionCard />);

      expect(screen.getByTestId('mission-step-title').textContent).toBe('Step 1 of 4: En Route to Pickup');
      expect(screen.getByTestId('mission-status-chip').textContent).toContain('To Pickup');
      expect(screen.getByTestId('step-advance-btn-label').textContent).toBe('Arrived at Pickup Location →');

      const advanceBtn = screen.getByTestId('btn-advance-step');
      await act(async () => {
        fireEvent.click(advanceBtn);
      });

      expect(useRiderStore.getState().tripPhase).toBe('at_pickup');
      expect(playMissionAcceptChimeSpy).toHaveBeenCalled();
    });

    it('renders parcel checklist in Step 2 (Parcel Collection) and advances to Step 3', async () => {
      useRiderStore.setState({ tripPhase: 'at_pickup' });

      render(<CenterMissionCard />);

      expect(screen.getByTestId('mission-step-title').textContent).toBe('Step 2 of 4: Parcel Collection');
      expect(screen.getByTestId('step2-checklist')).toBeDefined();
      expect(screen.getByText(/Verify Waybill #BF-48291/i)).toBeDefined();
      expect(screen.getByTestId('step-advance-btn-label').textContent).toBe('Confirm Package Collected →');

      const advanceBtn = screen.getByTestId('btn-advance-step');
      await act(async () => {
        fireEvent.click(advanceBtn);
      });

      expect(useRiderStore.getState().tripPhase).toBe('in_transit');
    });

    it('renders quick canned SMS pills in Step 3 (In Transit) and dispatches SMS toast', () => {
      useRiderStore.setState({ tripPhase: 'in_transit' });

      render(<CenterMissionCard />);

      expect(screen.getByTestId('mission-step-title').textContent).toBe('Step 3 of 4: In Transit to Drop-Off');
      expect(screen.getByTestId('step3-sms-box')).toBeDefined();

      const smsBtn = screen.getByRole('button', { name: /🛵 5 mins away/i });
      fireEvent.click(smsBtn);

      expect(useRiderStore.getState().toastMessage).toContain('5 minutes away');
      expect(playKeypadChimeSpy).toHaveBeenCalled();
    });

    it('renders "Scan QR / OTP Handover →" in Step 4 and triggers verification', () => {
      useRiderStore.setState({ tripPhase: 'at_dropoff' });
      const onOpenVerificationMock = vi.fn();

      render(<CenterMissionCard onOpenVerification={onOpenVerificationMock} />);

      expect(screen.getByTestId('mission-step-title').textContent).toBe('Step 4 of 4: Handover Verification');
      expect(screen.queryByTestId('btn-advance-step')).toBeNull();

      const verifyBtn = screen.getByTestId('btn-verify-handover');
      expect(verifyBtn).toBeDefined();

      fireEvent.click(verifyBtn);

      expect(useRiderStore.getState().isQuickQrOpen).toBe(true);
      expect(onOpenVerificationMock).toHaveBeenCalledWith('qr');
      expect(playKeypadChimeSpy).toHaveBeenCalled();
    });

    it('calls sender when in Steps 1-2, and recipient when in Steps 3-4', () => {
      const { rerender } = render(<CenterMissionCard />);

      const callBtn = screen.getByTestId('btn-call-party');
      fireEvent.click(callBtn);
      expect(useRiderStore.getState().toastMessage).toContain('Calling Sender: Kuchi Empire');

      act(() => {
        useRiderStore.setState({ tripPhase: 'in_transit' });
      });
      rerender(<CenterMissionCard />);

      fireEvent.click(callBtn);
      expect(useRiderStore.getState().toastMessage).toContain('Calling Recipient: Sarah Jenkins');
    });
  });

  describe('4. Strict N=1 Capacity Lock Store Layer', () => {
    it('blocks receiving new job offers when an active mission is in progress', () => {
      useRiderStore.setState({
        riderStatus: 'busy',
        tripPhase: 'in_transit',
        activeOrder: {
          _id: 'ord-123',
          trackingCode: '#LGS-123',
          status: 'in_transit',
          vehicleType: 'bike',
          paymentMethod: 'wallet',
          totalFareKobo: 200000,
          riderEarningKobo: 160000,
          estimatedDistanceKm: 3.0,
          pickup: {
            address: 'Ikeja',
            landmark: 'Near Bridge',
            location: { lat: 6.59, lng: 3.34 },
            contactName: 'Ade',
            contactPhone: '08012345678',
          },
          stops: [],
        },
      });

      const incomingOffer = {
        orderId: 'new-competing-order',
        trackingCode: '#LGS-COMPETE',
        pickupAddress: 'Lekki Phase 1',
        pickupLandmark: 'Admiralty',
        estimatedDistanceKm: 5.0,
        riderEarningKobo: 300000,
        stopsCount: 1,
        expiresAt: Date.now() + 30000,
      };

      useRiderStore.getState().receiveJobOffer(incomingOffer);

      // Offer MUST be dropped because Capacity Lock 1/1 is active
      expect(useRiderStore.getState().incomingOffer).toBeNull();
    });

    it('rejects acceptOffer when another active delivery is underway', async () => {
      useRiderStore.setState({
        tripPhase: 'arriving_pickup',
        activeOrder: {
          _id: 'ord-1',
          trackingCode: '#LGS-1',
          status: 'arrived_pickup',
          vehicleType: 'bike',
          paymentMethod: 'wallet',
          totalFareKobo: 200000,
          riderEarningKobo: 160000,
          estimatedDistanceKm: 2.5,
          pickup: {
            address: 'Yaba',
            landmark: 'Market',
            location: { lat: 6.5, lng: 3.3 },
            contactName: 'Bisi',
            contactPhone: '08022223333',
          },
          stops: [],
        },
      });

      const accepted = await useRiderStore.getState().acceptOffer('ord-competing-2');
      expect(accepted).toBe(false);
    });
  });

  describe('5. MissionProgressBar Component', () => {
    it('renders all 4 segments with correct active and done classes', () => {
      const { rerender } = render(<MissionProgressBar currentStep={1} />);

      expect(screen.getByTestId('step-seg-1').className).toContain('active');
      expect(screen.getByTestId('step-seg-2').className).not.toContain('active');

      rerender(<MissionProgressBar currentStep={3} />);
      expect(screen.getByTestId('step-seg-1').className).toContain('done');
      expect(screen.getByTestId('step-seg-2').className).toContain('done');
      expect(screen.getByTestId('step-seg-3').className).toContain('active');
      expect(screen.getByTestId('step-seg-4').className).not.toContain('active');
    });
  });
});
