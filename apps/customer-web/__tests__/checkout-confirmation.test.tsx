import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CheckoutConfirmationView } from '../components/CheckoutConfirmationView';
import { PaymentSuccessView } from '../components/PaymentSuccessView';
import { ThemeProvider } from '../components/ThemeProvider';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Stage 7: Checkout Confirmation & Payment Success Celebration', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.useRealTimers();
  });

  describe('1. CheckoutConfirmationView Component', () => {
    it('renders corridor details, mandatory landmarks, and package specs', () => {
      render(
        <ThemeProvider>
          <CheckoutConfirmationView />
        </ThemeProvider>
      );

      expect(screen.getByText(/Corridor Route Details/i)).toBeDefined();
      expect(screen.getByText('12 Commercial Avenue, Sabo, Yaba, Lagos')).toBeDefined();
      expect(screen.getByText('Opposite Ozone Cinemas, Yaba')).toBeDefined();
      expect(screen.getByText('Victoria Island Towers, Plot 4, Adeola Odeku, Lagos')).toBeDefined();
      expect(screen.getByText('Beside Zenith Bank Head Office')).toBeDefined();
      expect(screen.getByText('Design documents & tech prototype')).toBeDefined();
      expect(screen.getByText(/Total Escrow Fare/i)).toBeDefined();
    });

    it('displays error if wallet escrow balance is insufficient', () => {
      render(
        <ThemeProvider>
          <CheckoutConfirmationView walletBalanceKobo={100000} /> {/* ₦1,000 balance vs ₦4,700 fare */}
        </ThemeProvider>
      );

      const confirmBtn = screen.getByRole('button', { name: /Confirm & Lock Escrow/i });
      fireEvent.click(confirmBtn);

      expect(
        screen.getByText(/Insufficient Bayniks Wallet balance/i)
      ).toBeDefined();
    });

    it('simulates dispatch and calls onConfirmSuccess with waybill ID and 4-digit PIN', async () => {
      vi.useFakeTimers();
      const onConfirmSuccessMock = vi.fn();

      render(
        <ThemeProvider>
          <CheckoutConfirmationView
            walletBalanceKobo={5000000} // ₦50,000 balance
            onConfirmSuccess={onConfirmSuccessMock}
          />
        </ThemeProvider>
      );

      const confirmBtn = screen.getByRole('button', { name: /Confirm & Lock Escrow/i });
      fireEvent.click(confirmBtn);

      expect(screen.getByText(/Assigning Nearest Bike Courier\.\.\./i)).toBeDefined();

      act(() => {
        vi.advanceTimersByTime(800);
      });

      expect(onConfirmSuccessMock).toHaveBeenCalledWith(
        expect.objectContaining({
          waybillId: expect.stringMatching(/^BYN-LGS-\d{6}$/),
          handoverPin: expect.stringMatching(/^\d{4}$/),
          courierName: 'Tariq Danladi',
          courierPlate: 'LND-4912',
        })
      );
    });
  });

  describe('2. PaymentSuccessView Component (Fixes Prototype DOM Bug)', () => {
    it('renders celebration banner, 4-digit OTP, and fixes pickup/dropoff displays', () => {
      render(
        <ThemeProvider>
          <PaymentSuccessView />
        </ThemeProvider>
      );

      expect(screen.getByText(/Payment Confirmed!/i)).toBeDefined();
      expect(screen.getByText('₦4,700.00')).toBeDefined();
      expect(screen.getByText('4829')).toBeDefined(); // Handover PIN

      // Verify the IDs that crashed the designer prototype exist and render landmarks
      const pickupEl = document.getElementById('paySuccessPickupDisplay');
      expect(pickupEl).not.toBeNull();
      expect(pickupEl?.textContent).toContain('Sabo, Yaba');

      const dropoffEl = document.getElementById('paySuccessDropoffDisplay');
      expect(dropoffEl).not.toBeNull();
      expect(dropoffEl?.textContent).toContain('Adeola Odeku');

      expect(screen.getByText(/Tariq Danladi/i)).toBeDefined();
    });

    it('copies 4-digit OTP to clipboard on button click', () => {
      const mockClipboard = {
        writeText: vi.fn(),
      };
      Object.defineProperty(globalThis.navigator, 'clipboard', {
        value: mockClipboard,
        writable: true,
        configurable: true,
      });

      render(
        <ThemeProvider>
          <PaymentSuccessView />
        </ThemeProvider>
      );

      const copyBtn = screen.getByRole('button', { name: /Copy PIN/i });
      fireEvent.click(copyBtn);

      expect(mockClipboard.writeText).toHaveBeenCalledWith('4829');
      expect(screen.getAllByText(/Copied/i).length).toBeGreaterThanOrEqual(1);
    });

    it('opens WhatsApp share link when clicked', () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      render(
        <ThemeProvider>
          <PaymentSuccessView />
        </ThemeProvider>
      );

      const waBtn = screen.getByRole('button', { name: /WhatsApp/i });
      fireEvent.click(waBtn);

      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://wa.me/?text='),
        '_blank'
      );
    });

    it('routes to live tracking when Track Live Courier button is clicked', () => {
      render(
        <ThemeProvider>
          <PaymentSuccessView />
        </ThemeProvider>
      );

      const trackBtn = screen.getByRole('button', { name: /Track Live Courier on Radar/i });
      fireEvent.click(trackBtn);

      expect(mockPush).toHaveBeenCalledWith('/track/BYN-LGS-847291');
    });
  });
});

