// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { HeroEspressoCard } from '../components/HeroEspressoCard';
import { AvailabilityBar } from '../components/AvailabilityBar';
import { useRiderStore } from '../store/riderStore';
import * as audioChimes from '../utils/audioChimes';

describe('Stage 3: Rider Cockpit Home Screen & 56px Availability Switch', () => {
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

    // Set initial baseline state
    useRiderStore.setState({
      riderName: 'Babajide Adeleke',
      plateNumber: 'KJA-824-XY',
      riderStatus: 'offline',
      tripPhase: 'idle',
      activeOrder: null,
      todayEarningsKobo: 1850000, // ₦18,500.00
      tripsCompletedToday: 8,
      isQuickQrOpen: false,
      toastMessage: null,
      theme: 'light',
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('1. HeroEspressoCard Visual Structure & Token Fidelity', () => {
    it('renders the espresso-charcoal hero card, brand bolt, and BAYNIKS logo', () => {
      render(<HeroEspressoCard />);

      const card = screen.getByTestId('hero-espresso-card');
      expect(card).toBeDefined();
      expect(card.className).toContain('hero-espresso-card');
      expect(screen.getByText('BAYNIKS')).toBeDefined();
    });

    it('strictly DOES NOT render any dark mode option or theme toggle pill on the page', () => {
      render(<HeroEspressoCard />);

      // Ensure no theme toggle button, sun/moon icon, or dark mode switch exists
      expect(screen.queryByRole('button', { name: /Switch Theme/i })).toBeNull();
      expect(screen.queryByText(/Dark Mode/i)).toBeNull();
      expect(screen.queryByText(/Light Mode/i)).toBeNull();
      expect(document.querySelector('.theme-toggle-pill')).toBeNull();
    });

    it('renders the rider status pill reflecting offline and online states', () => {
      const { rerender } = render(<HeroEspressoCard />);

      const statusPill = screen.getByTestId('hero-status-pill');
      expect(statusPill.className).toContain('offline');
      expect(statusPill.textContent).toContain('OFFLINE');

      act(() => {
        useRiderStore.setState({ riderStatus: 'available' });
      });
      rerender(<HeroEspressoCard />);

      expect(statusPill.className).toContain('online');
      expect(statusPill.textContent).toContain('ONLINE');
    });

    it('renders rider initials in the avatar ring and personalized greeting with PRO badge', () => {
      render(<HeroEspressoCard />);

      // Initials for "Babajide Adeleke" should be "BA"
      const avatarRing = screen.getByTestId('avatar-orange-ring');
      expect(avatarRing.textContent).toBe('BA');

      const greeting = screen.getByTestId('hero-greeting');
      expect(greeting.textContent).toContain('Babajide');
      expect(screen.getByText('PRO')).toBeDefined();
      expect(screen.getByText(/KJA-824-XY/)).toBeDefined();
    });

    it('renders today net earnings in Space Grotesk tabular format and triggers QR scan', () => {
      const onOpenQrMock = vi.fn();
      render(<HeroEspressoCard onOpenQr={onOpenQrMock} />);

      const earningsDisplay = screen.getByTestId('hero-earnings-val');
      expect(earningsDisplay.textContent).toBe('₦18,500');
      expect(screen.getByText('8 completed deliveries today')).toBeDefined();

      const qrActionBtn = screen.getByTestId('hero-qr-action');
      fireEvent.click(qrActionBtn);

      expect(playKeypadChimeSpy).toHaveBeenCalled();
      expect(useRiderStore.getState().isQuickQrOpen).toBe(true);
      expect(onOpenQrMock).toHaveBeenCalled();
    });

    it('triggers notification bell click and dispatches toast when tapped', () => {
      const onOpenNotificationsMock = vi.fn();
      const { rerender } = render(<HeroEspressoCard onOpenNotifications={onOpenNotificationsMock} />);

      const bellBtn = screen.getByTestId('hero-bell-btn');
      fireEvent.click(bellBtn);

      expect(playKeypadChimeSpy).toHaveBeenCalled();
      expect(onOpenNotificationsMock).toHaveBeenCalledTimes(1);

      // Without callback, defaults to toast message
      rerender(<HeroEspressoCard />);
      fireEvent.click(bellBtn);
      expect(useRiderStore.getState().toastMessage).toContain('Notifications');
    });
  });

  describe('2. AvailabilityBar 56px Switch & Interactive Progression', () => {
    it('renders the 56px availability bar with Power icon and offline prompt', () => {
      render(<AvailabilityBar />);

      const bar = screen.getByTestId('availability-bar');
      expect(bar.className).toContain('availability-bar');
      expect(bar.className).not.toContain('is-online');

      expect(screen.getByTestId('avail-title').textContent).toBe('You are Offline');
      expect(screen.getByTestId('avail-subtitle').textContent).toBe('Tap to go online for assignments');
    });

    it('smoothly transitions to Online state on click with audio cue and toast notification', async () => {
      render(<AvailabilityBar />);

      const bar = screen.getByTestId('availability-bar');
      await act(async () => {
        fireEvent.click(bar);
      });

      expect(playMissionAcceptChimeSpy).toHaveBeenCalledTimes(1);
      expect(useRiderStore.getState().riderStatus).toBe('available');
      expect(useRiderStore.getState().toastMessage).toBe('You are ONLINE • Scanning Lagos corridor');
      expect(bar.className).toContain('is-online');
      expect(screen.getByTestId('avail-title').textContent).toBe('You are Online');
      expect(screen.getByTestId('avail-subtitle').textContent).toBe('Ready for nearby Lagos assignments');
    });

    it('toggles back to Offline on second click with keypad audio cue and offline toast', async () => {
      useRiderStore.setState({ riderStatus: 'available' });

      render(<AvailabilityBar />);

      const bar = screen.getByTestId('availability-bar');
      expect(bar.className).toContain('is-online');

      await act(async () => {
        fireEvent.click(bar);
      });

      expect(playKeypadChimeSpy).toHaveBeenCalledTimes(1);
      expect(useRiderStore.getState().riderStatus).toBe('offline');
      expect(useRiderStore.getState().toastMessage).toBe('You are now OFFLINE');
      expect(bar.className).not.toContain('is-online');
    });

    it('supports keyboard accessibility via Enter or Space key', async () => {
      render(<AvailabilityBar />);

      const bar = screen.getByTestId('availability-bar');
      await act(async () => {
        fireEvent.keyDown(bar, { key: 'Enter' });
      });

      expect(useRiderStore.getState().riderStatus).toBe('available');
    });
  });

  describe('3. Strict Capacity Lock Guard (N=1 Anti-Abandonment Enforcement)', () => {
    it('strictly forbids toggling offline when an active order is in transit, playing error chime', async () => {
      // Rider is currently on active delivery
      useRiderStore.setState({
        riderStatus: 'busy',
        tripPhase: 'in_transit',
        activeOrder: {
          _id: 'ord-active-99',
          trackingCode: '#LGS-998877',
          status: 'in_transit',
          vehicleType: 'bike',
          paymentMethod: 'wallet',
          totalFareKobo: 250000,
          riderEarningKobo: 200000,
          estimatedDistanceKm: 3.8,
          pickup: {
            address: 'Computer Village, Ikeja',
            landmark: 'Near Slot main',
            location: { lat: 6.5933, lng: 3.3421 },
            contactName: 'Adeola',
            contactPhone: '+2348011122233',
          },
          stops: [],
        },
      });

      render(<AvailabilityBar />);

      const bar = screen.getByTestId('availability-bar');
      await act(async () => {
        fireEvent.click(bar);
      });

      // Verification: Status MUST remain busy, error chime played, capacity lock toast displayed
      expect(playErrorChimeSpy).toHaveBeenCalledTimes(1);
      expect(useRiderStore.getState().riderStatus).toBe('busy');
      expect(useRiderStore.getState().toastMessage).toBe('Capacity locked (1/1): Complete active delivery first');
    });
  });
});

