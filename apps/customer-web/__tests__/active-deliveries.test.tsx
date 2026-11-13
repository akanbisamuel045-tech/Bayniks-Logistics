import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActiveDeliveriesView } from '../components/ActiveDeliveriesView';
import { ThemeProvider } from '../components/ThemeProvider';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Stage 8: Active Deliveries & Live Courier Radar', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('1. renders live GPS telemetry banner with ETA and remaining distance', () => {
    render(
      <ThemeProvider>
        <ActiveDeliveriesView />
      </ThemeProvider>
    );

    expect(screen.getByText(/LIVE GPS TELEMETRY ACTIVE/i)).toBeDefined();
    expect(screen.getByText(/Next Drop-off in 12 mins \(4\.8 km\)/i)).toBeDefined();
    expect(screen.getByText(/Waybill #BYN-LGS-847291/i)).toBeDefined();
  });

  it('2. displays 4-stage stepper with active In Transit state', () => {
    render(
      <ThemeProvider>
        <ActiveDeliveriesView />
      </ThemeProvider>
    );

    expect(screen.getByText(/Step 3 of 4 • In Transit/i)).toBeDefined();
    expect(screen.getByText('1. Booked')).toBeDefined();
    expect(screen.getByText('2. Picked Up')).toBeDefined();
    expect(screen.getByText('3. In Transit')).toBeDefined();
    expect(screen.getByText('4. Handover')).toBeDefined();
  });

  it('3. renders Lagos landmark radar corridors and focuses radar on click', () => {
    render(
      <ThemeProvider>
        <ActiveDeliveriesView />
      </ThemeProvider>
    );

    expect(screen.getByRole('button', { name: /Third Mainland Bridge/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Marina CMS Terminal/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Lekki-Ikoyi Link Bridge/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Obalende Bus Stop/i })).toBeDefined();

    // Click Marina CMS
    const marinaBtn = screen.getByRole('button', { name: /Marina CMS Terminal/i });
    fireEvent.click(marinaBtn);

    expect(screen.getByText(/LAT: 6\.4531° N, LNG: 3\.3958° E/i)).toBeDefined();
  });

  it('4. recenters radar on courier coordinates when button is clicked', () => {
    render(
      <ThemeProvider>
        <ActiveDeliveriesView />
      </ThemeProvider>
    );

    const recenterBtn = screen.getByRole('button', { name: /Recenter Courier/i });
    fireEvent.click(recenterBtn);

    expect(screen.getByText(/LAT: 6\.4969° N, LNG: 3\.3855° E/i)).toBeDefined();
  });

  it('5. renders courier contact card with phone link and chat action', () => {
    const onOpenChatMock = vi.fn();

    render(
      <ThemeProvider>
        <ActiveDeliveriesView onOpenChat={onOpenChatMock} />
      </ThemeProvider>
    );

    expect(screen.getByText('Tariq Danladi')).toBeDefined();
    expect(screen.getByText(/4\.95/i)).toBeDefined();
    expect(screen.getByText(/Bajaj Boxer 150cc • LND-4912/i)).toBeDefined();

    const callLink = screen.getByRole('link', { name: /Call Rider/i });
    expect(callLink.getAttribute('href')).toBe('tel:+2348031112233');

    const chatBtn = screen.getByRole('button', { name: /In-App Chat/i });
    fireEvent.click(chatBtn);

    expect(onOpenChatMock).toHaveBeenCalledWith('Tariq Danladi', 'BYN-LGS-847291');
  });

  it('6. filters deliveries between All, In Transit, and Pickup', () => {
    render(
      <ThemeProvider>
        <ActiveDeliveriesView />
      </ThemeProvider>
    );

    // Initial state: 2 active dispatches
    expect(screen.getByText(/Active Dispatches in Fleet \(2\)/i)).toBeDefined();

    // Filter In Transit
    const transitBtn = screen.getByRole('button', { name: /^In Transit \(1\)$/i });
    fireEvent.click(transitBtn);

    expect(screen.getByText(/Active Dispatches in Fleet \(1\)/i)).toBeDefined();
    expect(screen.getByText('#BYN-LGS-847291')).toBeDefined();
    expect(screen.queryByText('#BYN-LGS-482019')).toBeNull();

    // Filter Pickup
    const pickupBtn = screen.getByRole('button', { name: /^Pickup \(1\)$/i });
    fireEvent.click(pickupBtn);

    expect(screen.getByText(/Active Dispatches in Fleet \(1\)/i)).toBeDefined();
    expect(screen.queryByText('#BYN-LGS-847291')).toBeNull();
    expect(screen.getByText('#BYN-LGS-482019')).toBeDefined();
  });

  it('7. selects order from list and updates active telemetry', () => {
    const onSelectOrderMock = vi.fn();

    render(
      <ThemeProvider>
        <ActiveDeliveriesView onSelectOrder={onSelectOrderMock} />
      </ThemeProvider>
    );

    // Click order 2: #BYN-LGS-482019
    const order2Card = screen.getByText('#BYN-LGS-482019').closest('div[class*="rounded-3xl"]');
    expect(order2Card).not.toBeNull();
    fireEvent.click(order2Card!);

    expect(onSelectOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        waybillId: 'BYN-LGS-482019',
        courierName: 'Babatunde Adeleke',
      })
    );

    // Stepper updates to Step 1: Awaiting Pickup
    expect(screen.getByText(/Step 1 of 4 • Awaiting Pickup/i)).toBeDefined();
  });
});

