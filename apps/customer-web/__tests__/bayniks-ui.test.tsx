/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DesktopSidebar } from '../components/DesktopSidebar';
import { DesktopHeader } from '../components/DesktopHeader';
import { EnterpriseKpiConsole } from '../components/EnterpriseKpiConsole';
import { BookingForm } from '../components/BookingForm';
import { formatNaira } from '@logistics/shared-types';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe('Bayniks UI Alignment Migration: Design System, Tokens & Business Invariants', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock global fetch for pricing estimate
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            vehicleType: 'bike',
            estimatedDistanceKm: 15.2,
            estimatedDurationMinutes: 38,
            baseFareKobo: 250000,
            distanceFareKobo: 182400,
            durationTrafficFareKobo: 50000,
            multiStopSurchargeKobo: 0,
            totalFareKobo: 482400,
            platformCommissionKobo: 96480,
            riderEarningKobo: 385920,
            surgeMultiplier: 1.0,
            encodedPolyline: '',
          }),
      })
    );
  });

  describe('1. Brand Identity & Atomic Orange Palette', () => {
    it('renders Bayniks brand identity and Atomic Orange color classes in DesktopSidebar', () => {
      const { container } = render(
        <DesktopSidebar
          collapsed={false}
          onToggleCollapse={vi.fn()}
          activeTab="dashboard"
          onSelectTab={vi.fn()}
          walletBalanceKobo={4520000}
        />
      );

      expect(screen.getByText('BAYNIKS')).toBeInTheDocument();
      expect(screen.getByText('Express Logistics')).toBeInTheDocument();
      expect(screen.getByText('Console Home')).toBeInTheDocument();
      expect(screen.getByText('Active Deliveries')).toBeInTheDocument();

      // Verify Atomic Orange background/glow classes are present
      const orangeElements = container.querySelectorAll('.bg-bayniks-orange, .text-bayniks-orange, .shadow-bolt-glow');
      expect(orangeElements.length).toBeGreaterThan(0);
    });

    it('renders DesktopHeader with Lagos Hub live status pill and omni-search', () => {
      render(
        <DesktopHeader
          onOpenQrScanner={vi.fn()}
          onBookDeliveryClick={vi.fn()}
        />
      );

      expect(screen.getByText('Hub Online • 99.4% SLA')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search waybill/i)).toBeInTheDocument();
      expect(screen.getByText('Book Delivery')).toBeInTheDocument();
    });
  });

  describe('2. Mandatory Nigerian Landmark Enforcement', () => {
    it('strictly prevents order submission if pickup landmark is empty', async () => {
      const { container } = render(<BookingForm onRouteUpdated={vi.fn()} />);

      // Find pickup landmark input
      const pickupLandmarkInput = screen.getByPlaceholderText(/Opposite Slot, beside Yellow Gate/i);
      expect(pickupLandmarkInput).toBeInTheDocument();

      // Clear the landmark
      fireEvent.change(pickupLandmarkInput, { target: { value: '' } });

      // Submit form
      const form = container.querySelector('form')!;
      fireEvent.submit(form);

      // Verify validation error
      expect(
        await screen.findByText('Pickup landmark is required for Nigerian street navigation')
      ).toBeInTheDocument();
    });

    it('strictly prevents order submission if any drop-off stop landmark is empty', async () => {
      const { container } = render(<BookingForm onRouteUpdated={vi.fn()} />);

      // Set valid pickup landmark
      const pickupLandmarkInput = screen.getByPlaceholderText(/Opposite Slot, beside Yellow Gate/i);
      fireEvent.change(pickupLandmarkInput, { target: { value: 'Otigba Street, opposite Slot' } });

      // Clear drop-off landmark
      const dropoffLandmarkInput = screen.getByPlaceholderText(/Opposite Total Energies/i);
      fireEvent.change(dropoffLandmarkInput, { target: { value: '' } });

      // Submit form
      const form = container.querySelector('form')!;
      fireEvent.submit(form);

      // Verify validation error
      expect(
        await screen.findByText('Drop-off Landmark is required for Stop 1')
      ).toBeInTheDocument();
    });
  });

  describe('3. Dynamic Multi-Stop Delivery Stops (1 to 5 Stops)', () => {
    it('dynamically adds and removes delivery stops', async () => {
      render(<BookingForm onRouteUpdated={vi.fn()} />);

      // Initially 1 stop
      expect(screen.getByText(/Delivery Stops \(1\/5\)/i)).toBeInTheDocument();
      expect(screen.getByText('DROP-OFF STOP 1')).toBeInTheDocument();
      expect(screen.queryByText('DROP-OFF STOP 2')).not.toBeInTheDocument();

      // Add another stop
      const addStopBtn = screen.getByRole('button', { name: /Add Another Drop-off Stop/i });
      fireEvent.click(addStopBtn);

      // Now 2 stops
      expect(screen.getByText(/Delivery Stops \(2\/5\)/i)).toBeInTheDocument();
      expect(screen.getByText('DROP-OFF STOP 2')).toBeInTheDocument();

      // Remove stop 2
      const removeBtns = screen.getAllByText('Remove');
      fireEvent.click(removeBtns[0]!);

      // Back to 1 stop
      expect(screen.getByText(/Delivery Stops \(1\/5\)/i)).toBeInTheDocument();
      expect(screen.queryByText('DROP-OFF STOP 2')).not.toBeInTheDocument();
    });
  });

  describe('4. Financial Precision & Naira Currency Formatting', () => {
    it('formats integer Kobo correctly into Nigerian Naira in KPI console', () => {
      render(
        <EnterpriseKpiConsole
          activeDeliveriesCount={5}
          completedDeliveriesCount={1489}
          onTimeSlaPercent={99.4}
          walletBalanceKobo={4520000}
        />
      );

      // 4,520,000 kobo = ₦45,200.00
      expect(screen.getByText('₦45,200.00')).toBeInTheDocument();
      expect(screen.getByText('99.4%')).toBeInTheDocument();
      expect(screen.getByText('1,489')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('verifies formatNaira pure math utility', () => {
      expect(formatNaira(250000)).toBe('₦2,500.00');
      expect(formatNaira(0)).toBe('₦0.00');
      expect(formatNaira(15000000)).toBe('₦150,000.00');
    });
  });
});
