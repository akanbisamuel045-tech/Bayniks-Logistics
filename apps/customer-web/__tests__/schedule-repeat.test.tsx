import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ScheduleDeliveryView } from '../components/ScheduleDeliveryView';
import { RepeatDeliveryView, RepeatRoute } from '../components/RepeatDeliveryView';
import { ThemeProvider } from '../components/ThemeProvider';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Stage 10: Schedule Delivery & Repeat Order Suite', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1. ScheduleDeliveryView Component', () => {
    it('renders hero guarantee card and default Lagos landmark route specs', () => {
      render(
        <ThemeProvider>
          <ScheduleDeliveryView
            defaultPickup="12 Commercial Avenue, Sabo Yaba, Lagos"
            defaultPickupLandmark="Near Ozone Cinemas"
            defaultDropoff="Victoria Island Towers, Adeola Odeku, Lagos"
            defaultDropoffLandmark="Opposite Eko Hotel Roundabout"
          />
        </ThemeProvider>
      );

      expect(screen.getByText(/Scheduled Courier Guarantee/i)).toBeDefined();
      expect(screen.getByText(/94% Slots Open/i)).toBeDefined();
      expect(screen.getByText(/₦500k Cargo Cover/i)).toBeDefined();

      // Landmarks
      expect(screen.getByText(/Near Ozone Cinemas/i)).toBeDefined();
      expect(screen.getByText(/Opposite Eko Hotel Roundabout/i)).toBeDefined();
    });

    it('switches timing mode between Pickup and Guaranteed Drop-off Window', () => {
      render(
        <ThemeProvider>
          <ScheduleDeliveryView />
        </ThemeProvider>
      );

      const dropoffBtn = screen.getByRole('button', { name: /Guaranteed Drop-off Window/i });
      fireEvent.click(dropoffBtn);

      expect(
        screen.getByText(/Parcel will be safely delivered at the destination within this guaranteed window/i)
      ).toBeDefined();

      const pickupBtn = screen.getByRole('button', { name: /Schedule Pickup Time/i });
      fireEvent.click(pickupBtn);

      expect(
        screen.getByText(/Courier arrives at pickup address within the selected timeframe/i)
      ).toBeDefined();
    });

    it('allows selecting a future date and updates selected date label', () => {
      render(
        <ThemeProvider>
          <ScheduleDeliveryView />
        </ThemeProvider>
      );

      // Default is Tomorrow (Oct 27)
      expect(screen.getByText('Tomorrow, Oct 27')).toBeDefined();

      // Click Weekend (Oct 31)
      const satCard = screen.getByText('Weekend').closest('button')!;
      fireEvent.click(satCard);

      expect(screen.getByText('Saturday, Oct 31')).toBeDefined();
    });

    it('updates Kobo fare breakdown when selecting evening rush slot and large tier', () => {
      render(
        <ThemeProvider>
          <ScheduleDeliveryView />
        </ThemeProvider>
      );

      // Base: ₦3,500 + Medium: ₦700 + Slot: ₦500 = ₦4,700
      expect(screen.getByText('₦4,700')).toBeDefined();

      // Select Evening Rush slot (+₦200)
      const eveningSlot = screen.getByText('05:00 PM – 08:00 PM').closest('[role="button"]')!;
      fireEvent.click(eveningSlot);

      expect(screen.getByText(/Evening Rush Surcharge/i)).toBeDefined();
      expect(screen.getByText('₦4,900')).toBeDefined();

      // Change Package Tier to Large Cargo (+₦1,800 instead of ₦700 => +₦1,100 => ₦6,000)
      const select = screen.getByLabelText(/Package Size Tier/i);
      fireEvent.change(select, { target: { value: 'large' } });

      expect(screen.getByText('₦6,000')).toBeDefined();
    });

    it('toggles recurring delivery options and frequency pills', () => {
      render(
        <ThemeProvider>
          <ScheduleDeliveryView />
        </ThemeProvider>
      );

      const toggle = screen.getByLabelText(/Recurring Delivery Toggle/i);
      expect(screen.queryByText('Repeat Frequency')).toBeNull();

      // Turn ON recurring
      fireEvent.click(toggle);
      expect(screen.getByText('Repeat Frequency')).toBeDefined();
      expect(screen.getByRole('button', { name: 'Weekdays' })).toBeDefined();

      // Select Weekdays
      fireEvent.click(screen.getByRole('button', { name: 'Weekdays' }));
    });

    it('submits scheduled reservation and invokes callback with details', () => {
      const onConfirmMock = vi.fn();

      render(
        <ThemeProvider>
          <ScheduleDeliveryView onConfirmSchedule={onConfirmMock} />
        </ThemeProvider>
      );

      const confirmBtn = screen.getByRole('button', { name: /Confirm & Lock Schedule Slot/i });
      fireEvent.click(confirmBtn);

      expect(onConfirmMock).toHaveBeenCalledTimes(1);
      const reservation = onConfirmMock.mock.calls[0]![0];
      expect(reservation.timingMode).toBe('pickup');
      expect(reservation.timeSlot).toBe('11:00 AM – 02:00 PM');
      expect(reservation.totalKobo).toBe(470000);

      // Modal appears
      expect(screen.getByText(/Reservation Locked!/i)).toBeDefined();
    });
  });

  describe('2. RepeatDeliveryView Component', () => {
    it('renders hero metrics strip and default repeat templates', () => {
      render(
        <ThemeProvider>
          <RepeatDeliveryView walletBalanceKobo={4520000} />
        </ThemeProvider>
      );

      expect(screen.getByText(/Smart Route Memory/i)).toBeDefined();
      expect(screen.getByText(/4 Saved/i)).toBeDefined();
      expect(screen.getByText(/Tech Store → Lekki Phase 1/i)).toBeDefined();
      expect(screen.getByText(/VI Corporate HQ → Ikoyi Crescent/i)).toBeDefined();
      expect(screen.getByText(/Central Warehouse → Ikeja GRA Hub/i)).toBeDefined();
      expect(screen.getByText(/Home Residence → Maryland Mall/i)).toBeDefined();
    });

    it('filters routes dynamically by search query and category pills', () => {
      render(
        <ThemeProvider>
          <RepeatDeliveryView />
        </ThemeProvider>
      );

      // Search for "Contracts"
      const searchInput = screen.getByPlaceholderText(/Search past routes/i);
      fireEvent.change(searchInput, { target: { value: 'Contracts' } });

      expect(screen.getByText(/VI Corporate HQ → Ikoyi Crescent/i)).toBeDefined();
      expect(screen.queryByText(/Tech Store → Lekki Phase 1/i)).toBeNull();

      // Clear search
      const clearBtn = screen.getByRole('button', { name: /Clear Search/i });
      fireEvent.click(clearBtn);

      // Filter by Favorites category
      const favFilterBtn = screen.getByRole('button', { name: /Favorites/i });
      fireEvent.click(favFilterBtn);

      expect(screen.getByText(/Tech Store → Lekki Phase 1/i)).toBeDefined();
      expect(screen.getByText(/VI Corporate HQ → Ikoyi Crescent/i)).toBeDefined();
      expect(screen.queryByText(/Central Warehouse → Ikeja GRA Hub/i)).toBeNull();
    });

    it('toggles favorite star state on a repeat route card', () => {
      render(
        <ThemeProvider>
          <RepeatDeliveryView />
        </ThemeProvider>
      );

      const favBtn = screen.getByLabelText(/Toggle favorite for Tech Store → Lekki Phase 1/i);
      expect(favBtn).toBeDefined();

      fireEvent.click(favBtn);
      expect(screen.getByText(/Removed from Favorites/i)).toBeDefined();
    });

    it('opens 1-Tap Re-Order modal and confirms re-dispatch', () => {
      const onConfirmReOrderMock = vi.fn();

      render(
        <ThemeProvider>
          <RepeatDeliveryView
            onConfirmReOrder={onConfirmReOrderMock}
            walletBalanceKobo={5000000}
          />
        </ThemeProvider>
      );

      // Click 1-Tap Re-Order on first card
      const reOrderBtns = screen.getAllByRole('button', { name: /1-Tap Re-Order/i });
      fireEvent.click(reOrderBtns[0]!);

      // Modal opens
      expect(screen.getByText(/Instant 1-Tap Re-Dispatch/i)).toBeDefined();
      expect(screen.getByText(/Michael Chen • \+234 812 990 3412/i)).toBeDefined();
      expect(screen.getByText('₦50,000')).toBeDefined(); // Wallet balance

      // Confirm
      const confirmDispatchBtn = screen.getByRole('button', { name: /Confirm 1-Tap Re-Order/i });
      fireEvent.click(confirmDispatchBtn);

      // Fast forward fake timer for dispatch simulation
      act(() => {
        vi.advanceTimersByTime(750);
      });

      expect(onConfirmReOrderMock).toHaveBeenCalledTimes(1);
      expect(onConfirmReOrderMock.mock.calls[0]![0].id).toBe('rep-1');
    });

    it('navigates to customization via Customize button', () => {
      const onCustomMock = vi.fn();

      render(
        <ThemeProvider>
          <RepeatDeliveryView onCustomDispatch={onCustomMock} />
        </ThemeProvider>
      );

      const customizeBtns = screen.getAllByRole('button', { name: /Customize/i });
      fireEvent.click(customizeBtns[0]!);

      expect(onCustomMock).toHaveBeenCalledTimes(1);
      expect(onCustomMock.mock.calls[0]![0].id).toBe('rep-1');
    });
  });
});
