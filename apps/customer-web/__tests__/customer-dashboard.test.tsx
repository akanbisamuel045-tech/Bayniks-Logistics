import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerDashboard } from '../components/CustomerDashboard';
import { ThemeProvider } from '../components/ThemeProvider';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Stage 4: Customer Dashboard Hub & Responsive Navigation', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('1. renders the Enterprise Welcome Banner with Lagos dispatch status', () => {
    render(
      <ThemeProvider>
        <CustomerDashboard onNewDeliveryClick={vi.fn()} />
      </ThemeProvider>
    );

    expect(
      screen.getByText(/Lagos Metropolitan Dispatch Console • Active/i)
    ).toBeDefined();
    expect(screen.getByText(/Welcome back, Kainul Stevano/i)).toBeDefined();
    expect(screen.getByText(/₦500k guaranteed cargo insurance/i)).toBeDefined();
  });

  it('2. displays the 4-Card KPI Console with live metrics', () => {
    render(
      <ThemeProvider>
        <CustomerDashboard onNewDeliveryClick={vi.fn()} walletBalanceKobo={3425000} />
      </ThemeProvider>
    );

    expect(screen.getByText('Active Deliveries')).toBeDefined();
    expect(screen.getByText('Completed Waybills')).toBeDefined();
    expect(screen.getByText('On-Time SLA')).toBeDefined();
    expect(screen.getByText('Escrow Balance')).toBeDefined();
    expect(screen.getByText('₦34,250.00')).toBeDefined();
  });

  it('3. renders the 4 Quick Delivery Action cards', () => {
    render(
      <ThemeProvider>
        <CustomerDashboard onNewDeliveryClick={vi.fn()} />
      </ThemeProvider>
    );

    expect(screen.getByText('New Delivery')).toBeDefined();
    expect(screen.getByText('Schedule Pickup')).toBeDefined();
    expect(screen.getByText('Repeat Route')).toBeDefined();
    expect(screen.getByText('Saved Addresses')).toBeDefined();
  });

  it('4. triggers onNewDeliveryClick from the banner and quick action card', () => {
    const onNewDeliveryMock = vi.fn();

    render(
      <ThemeProvider>
        <CustomerDashboard onNewDeliveryClick={onNewDeliveryMock} />
      </ThemeProvider>
    );

    const bannerBtn = screen.getByRole('button', { name: /New Dispatch/i });
    fireEvent.click(bannerBtn);
    expect(onNewDeliveryMock).toHaveBeenCalledTimes(1);

    const quickActionBtn = screen.getByRole('button', { name: /Instant motorcycle dispatch/i });
    fireEvent.click(quickActionBtn);
    expect(onNewDeliveryMock).toHaveBeenCalledTimes(2);
  });

  it('5. filters active deliveries using filter pills (All, In Transit, Awaiting Pickup)', () => {
    render(
      <ThemeProvider>
        <CustomerDashboard onNewDeliveryClick={vi.fn()} />
      </ThemeProvider>
    );

    // Initial state: both orders visible
    expect(screen.getByText('BYN-LGS-847291')).toBeDefined();
    expect(screen.getByText('BYN-LGS-482019')).toBeDefined();

    // Filter to 'In Transit'
    const inTransitBtn = screen.getByRole('button', { name: /In Transit \(1\)/i });
    fireEvent.click(inTransitBtn);

    expect(screen.getByText('BYN-LGS-847291')).toBeDefined();
    expect(screen.queryByText('BYN-LGS-482019')).toBeNull();

    // Filter to 'Awaiting Pickup'
    const awaitingBtn = screen.getByRole('button', { name: /Awaiting Pickup \(1\)/i });
    fireEvent.click(awaitingBtn);

    expect(screen.queryByText('BYN-LGS-847291')).toBeNull();
    expect(screen.getByText('BYN-LGS-482019')).toBeDefined();

    // Reset filter to 'All'
    const allBtn = screen.getByRole('button', { name: /All \(2\)/i });
    fireEvent.click(allBtn);

    expect(screen.getByText('BYN-LGS-847291')).toBeDefined();
    expect(screen.getByText('BYN-LGS-482019')).toBeDefined();
  });

  it('6. displays Lagos corridors, mandatory Nigerian landmarks, and courier details', () => {
    render(
      <ThemeProvider>
        <CustomerDashboard onNewDeliveryClick={vi.fn()} />
      </ThemeProvider>
    );

    // Order 1 corridors and landmarks
    expect(screen.getByText('12 Commercial Avenue, Sabo, Yaba')).toBeDefined();
    expect(screen.getByText('Landmark: Opposite Ozone Cinemas')).toBeDefined();
    expect(screen.getByText('Plot 4, Adeola Odeku Street, Victoria Island')).toBeDefined();
    expect(screen.getByText('Landmark: Beside Zenith Bank Head Office')).toBeDefined();
    expect(screen.getByText('Tariq Danladi')).toBeDefined();
    expect(screen.getByText('4829')).toBeDefined(); // Handover PIN

    // Order 2 corridors and landmarks
    expect(screen.getByText('Otigba Street, Computer Village, Ikeja')).toBeDefined();
    expect(screen.getByText('Landmark: Opposite Slot Store Main Entrance')).toBeDefined();
    expect(screen.getByText('Admiralty Way, Lekki Phase 1')).toBeDefined();
    expect(screen.getByText('Landmark: Beside Tastee Fried Chicken')).toBeDefined();
    expect(screen.getByText('Babatunde Adeleke')).toBeDefined();
    expect(screen.getByText('7104')).toBeDefined(); // Handover PIN
  });

  it('7. triggers onOrderClick when an order card is clicked', () => {
    const onOrderClickMock = vi.fn();

    render(
      <ThemeProvider>
        <CustomerDashboard
          onNewDeliveryClick={vi.fn()}
          onOrderClick={onOrderClickMock}
        />
      </ThemeProvider>
    );

    const detailsBtns = screen.getAllByRole('button', { name: /^Details$/i });
    expect(detailsBtns.length).toBeGreaterThan(0);
    fireEvent.click(detailsBtns[0]!);

    expect(onOrderClickMock).toHaveBeenCalledWith(
      expect.objectContaining({
        trackingCode: 'BYN-LGS-847291',
        courierName: 'Tariq Danladi',
      })
    );
  });
});
