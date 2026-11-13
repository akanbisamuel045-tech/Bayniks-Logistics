import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationsCenterView } from '../components/NotificationsCenterView';
import { ThemeProvider } from '../components/ThemeProvider';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Stage 15: Notifications Center Suite', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  describe('1. NotificationsCenterView Component Rendering & Feed Structure', () => {
    it('renders header, unread badge counter (3 NEW), and feed items with categories', () => {
      render(
        <ThemeProvider>
          <NotificationsCenterView />
        </ThemeProvider>
      );

      expect(screen.getByRole('heading', { name: /Notifications/i })).toBeDefined();
      expect(screen.getByText(/3 NEW/i)).toBeDefined();
      expect(screen.getByText(/Courier is 5 mins away!/i)).toBeDefined();
      expect(screen.getByText(/Handover Security PIN \(OTP\)/i)).toBeDefined();
      expect(screen.getByText(/Wallet Credited \(\+₦20,000\.00\)/i)).toBeDefined();
    });

    it('filters notifications by category pills (Deliveries, Security, Wallet & Promos)', () => {
      render(
        <ThemeProvider>
          <NotificationsCenterView />
        </ThemeProvider>
      );

      // Filter by Deliveries
      const deliveriesBtn = screen.getByRole('button', { name: /Deliveries/i });
      fireEvent.click(deliveriesBtn);

      expect(screen.getByText(/Courier is 5 mins away!/i)).toBeDefined();
      expect(screen.queryByText(/Handover Security PIN/i)).toBeNull();

      // Filter by Security & OTP
      const securityBtn = screen.getByRole('button', { name: /Security & OTP/i });
      fireEvent.click(securityBtn);

      expect(screen.getByText(/Handover Security PIN \(OTP\)/i)).toBeDefined();
      expect(screen.queryByText(/Courier is 5 mins away!/i)).toBeNull();

      // Filter by Wallet & Promos
      const walletPromoBtn = screen.getByRole('button', { name: /Wallet & Promos/i });
      fireEvent.click(walletPromoBtn);

      expect(screen.getByText(/Wallet Credited \(\+₦20,000\.00\)/i)).toBeDefined();
      expect(screen.getByText(/15% Off Your Next Lagos Dispatch!/i)).toBeDefined();
      expect(screen.queryByText(/Courier is 5 mins away!/i)).toBeNull();
    });

    it('marks all notifications as read with 1-click header action', () => {
      render(
        <ThemeProvider>
          <NotificationsCenterView />
        </ThemeProvider>
      );

      const readAllBtn = screen.getByRole('button', { name: /Read All/i });
      fireEvent.click(readAllBtn);

      expect(screen.getByText(/ALL READ/i)).toBeDefined();
      expect(screen.getByText(/All notifications marked as read/i)).toBeDefined();
    });

    it('clears notification feed and displays All caught up empty state', () => {
      render(
        <ThemeProvider>
          <NotificationsCenterView />
        </ThemeProvider>
      );

      // First mark all read to reveal Clear button
      const readAllBtn = screen.getByRole('button', { name: /Read All/i });
      fireEvent.click(readAllBtn);

      const clearBtn = screen.getByRole('button', { name: /Clear/i });
      fireEvent.click(clearBtn);

      expect(screen.getByText(/All caught up!/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Back to Home/i })).toBeDefined();
    });

    it('allows dismissing individual notifications', () => {
      render(
        <ThemeProvider>
          <NotificationsCenterView />
        </ThemeProvider>
      );

      const dismissBtn = screen.getByLabelText(/Dismiss 15% Off Your Next Lagos Dispatch!/i);
      fireEvent.click(dismissBtn);

      expect(screen.getByText(/Notification dismissed/i)).toBeDefined();
      expect(screen.queryByText(/15% Off Your Next Lagos Dispatch!/i)).toBeNull();
    });
  });

  describe('2. Security PIN & 1-Tap Action Handlers', () => {
    it('displays 4-digit handover PIN and copies to clipboard on button click', () => {
      render(
        <ThemeProvider>
          <NotificationsCenterView />
        </ThemeProvider>
      );

      expect(screen.getByText(/4-Digit Handover PIN:/i)).toBeDefined();
      expect(screen.getByText('4829')).toBeDefined();

      const copyBtn = screen.getByRole('button', { name: /Copy PIN/i });
      fireEvent.click(copyBtn);

      expect(screen.getByText(/Copied 4-digit PIN: 4829!/i)).toBeDefined();
    });

    it('triggers Track Live action on delivery notification and routes to /deliveries', () => {
      render(
        <ThemeProvider>
          <NotificationsCenterView />
        </ThemeProvider>
      );

      const trackBtn = screen.getByRole('button', { name: /Track Live/i });
      fireEvent.click(trackBtn);

      expect(mockPush).toHaveBeenCalledWith('/deliveries');
    });

    it('triggers View Handover Pass action on OTP notification and routes to /handover', () => {
      render(
        <ThemeProvider>
          <NotificationsCenterView />
        </ThemeProvider>
      );

      const otpActionBtn = screen.getByRole('button', { name: /View Handover Pass/i });
      fireEvent.click(otpActionBtn);

      expect(mockPush).toHaveBeenCalledWith('/handover');
    });

    it('triggers View Wallet action on wallet deposit notification and routes to /wallet/history', () => {
      render(
        <ThemeProvider>
          <NotificationsCenterView />
        </ThemeProvider>
      );

      const walletActionBtn = screen.getByRole('button', { name: /View Wallet/i });
      fireEvent.click(walletActionBtn);

      expect(mockPush).toHaveBeenCalledWith('/wallet/history');
    });

    it('triggers Use Voucher Code action on promo notification and routes to /shipment/new', () => {
      render(
        <ThemeProvider>
          <NotificationsCenterView />
        </ThemeProvider>
      );

      const promoActionBtn = screen.getByRole('button', { name: /Use Voucher Code/i });
      fireEvent.click(promoActionBtn);

      expect(screen.getByText(/Voucher code BAYNIKSFAST15 applied!/i)).toBeDefined();
      expect(mockPush).toHaveBeenCalledWith('/shipment/new');
    });
  });
});

