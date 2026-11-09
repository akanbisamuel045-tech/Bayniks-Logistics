/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { VendorBulkUploader } from '../components/vendor/VendorBulkUploader';
import { VendorBatchCheckoutCard } from '../components/vendor/VendorBatchCheckoutCard';
import { VendorMultiBikeMap } from '../components/vendor/VendorMultiBikeMap';
import VendorWorkstationPage from '../app/vendor/page';
import { DesktopSidebar } from '../components/DesktopSidebar';
import { DesktopHeader } from '../components/DesktopHeader';
import { formatNaira, VendorBatchSummaryResponse } from '@logistics/shared-types';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
}));

describe('Stage 17: Business Vendor Portal & Bulk Multi-Stop Dispatch UI', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. VendorBulkUploader Component', () => {
    it('renders header, sample download button, and load demo batch button', () => {
      render(<VendorBulkUploader onRowsValidated={vi.fn()} />);

      expect(screen.getByText(/Bulk Multi-Stop Dispatch Workstation/i)).toBeInTheDocument();
      expect(screen.getByText(/Download Sample CSV/i)).toBeInTheDocument();
      expect(screen.getByText(/Load 6-Stop Demo Batch/i)).toBeInTheDocument();
    });

    it('loads 6-stop demo batch, renders mandatory landmark badges, and calls onRowsValidated', () => {
      const handleValidated = vi.fn();
      render(<VendorBulkUploader onRowsValidated={handleValidated} />);

      const demoBtn = screen.getByText(/Load 6-Stop Demo Batch/i);
      fireEvent.click(demoBtn);

      expect(handleValidated).toHaveBeenCalledTimes(1);
      const rowsPassed = handleValidated.mock.calls[0]![0];
      expect(rowsPassed).toHaveLength(6);

      // Verify mandatory Nigerian landmarks are highlighted
      expect(screen.getByText(/Opposite Slot Ikeja/i)).toBeInTheDocument();
      expect(screen.getByText(/Near Ebeano Supermarket/i)).toBeInTheDocument();
      expect(screen.getByText(/Opposite CMS Bookshop/i)).toBeInTheDocument();

      // Verify manifest count and auto-grouping into 2 bike runs (since 6 > 5)
      expect(screen.getByText(/6 Valid Stops/i)).toBeInTheDocument();
      expect(screen.getByText(/Auto-grouped into 2 motorcycle runs/i)).toBeInTheDocument();
    });

    it('allows deleting a stop from the manifest table', () => {
      const handleValidated = vi.fn();
      render(<VendorBulkUploader onRowsValidated={handleValidated} />);

      fireEvent.click(screen.getByText(/Load 6-Stop Demo Batch/i));
      expect(screen.getByText(/6 Valid Stops/i)).toBeInTheDocument();

      // Delete first row
      const deleteButtons = screen.getAllByTitle('Remove stop');
      fireEvent.click(deleteButtons[0]!);

      expect(screen.getByText(/5 Valid Stops/i)).toBeInTheDocument();
      expect(screen.getByText(/Auto-grouped into 1 motorcycle run/i)).toBeInTheDocument();
    });
  });

  describe('2. VendorBatchCheckoutCard Component', () => {
    const mockSummary: VendorBatchSummaryResponse = {
      totalRunsCount: 2,
      totalStopsCount: 6,
      grandTotalFareKobo: 750000, // ₦7,500.00
      runs: [
        {
          batchGroupKey: 'RUN-1-A',
          stopsCount: 5,
          estimatedFareKobo: 550000,
          totalDistanceKm: 18.4,
          estimatedDurationMinutes: 45,
        },
        {
          batchGroupKey: 'RUN-1-B',
          stopsCount: 1,
          estimatedFareKobo: 200000,
          totalDistanceKm: 7.2,
          estimatedDurationMinutes: 20,
        },
      ],
    };

    it('displays runs count, total stops, grand total fare in Naira, and per-run breakdown', () => {
      render(
        <VendorBatchCheckoutCard
          summary={mockSummary}
          walletBalanceKobo={10000000} // ₦100,000
          paymentMethod="wallet"
          onPaymentMethodChange={vi.fn()}
          onConfirmDispatch={vi.fn()}
          isDispatching={false}
          isEstimating={false}
        />
      );

      expect(screen.getAllByText(/2 Bike Runs/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(formatNaira(750000))).toBeInTheDocument();
      expect(screen.getByText(/⚡ RUN-1-A/i)).toBeInTheDocument();
      expect(screen.getByText(/⚡ RUN-1-B/i)).toBeInTheDocument();
      expect(screen.getByText(/Motorcycle fleet: max 5 parcel stops per courier/i)).toBeInTheDocument();
    });

    it('shows warning and disables dispatch CTA when escrow wallet balance is insufficient', () => {
      const handleConfirm = vi.fn();
      render(
        <VendorBatchCheckoutCard
          summary={mockSummary}
          walletBalanceKobo={200000} // ₦2,000 (Required: ₦7,500)
          paymentMethod="wallet"
          onPaymentMethodChange={vi.fn()}
          onConfirmDispatch={handleConfirm}
          isDispatching={false}
          isEstimating={false}
        />
      );

      expect(screen.getByText(/Insufficient Wallet Balance/i)).toBeInTheDocument();
      const dispatchBtn = screen.getByRole('button', { name: /Dispatch 2 Bike Runs/i });
      expect(dispatchBtn).toBeDisabled();

      fireEvent.click(dispatchBtn);
      expect(handleConfirm).not.toHaveBeenCalled();
    });

    it('enables dispatch CTA and triggers confirm callback when wallet is funded', () => {
      const handleConfirm = vi.fn();
      render(
        <VendorBatchCheckoutCard
          summary={mockSummary}
          walletBalanceKobo={5000000} // ₦50,000
          paymentMethod="wallet"
          onPaymentMethodChange={vi.fn()}
          onConfirmDispatch={handleConfirm}
          isDispatching={false}
          isEstimating={false}
        />
      );

      const dispatchBtn = screen.getByRole('button', { name: /Dispatch 2 Bike Runs/i });
      expect(dispatchBtn).not.toBeDisabled();

      fireEvent.click(dispatchBtn);
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. VendorMultiBikeMap Component', () => {
    it('renders radar canvas, central warehouse hub, and courier markers', () => {
      const mockOrders = [
        {
          id: 'ord-1',
          trackingCode: 'LGS-112233',
          status: 'searching_rider',
          totalFareKobo: 350000,
          pickup: {
            address: 'Warehouse Hub Ikeja',
            landmark: 'Opposite General Hospital',
            location: { lat: 6.5933, lng: 3.3421 },
            pickupPin: '1234',
          },
          stops: [
            {
              sequenceNumber: 1,
              recipientName: 'Tunde B.',
              recipientPhone: '+2348011112222',
              dropoffAddress: 'Victoria Island',
              dropoffLandmark: 'Beside Zenith',
              dropoffLocation: { lat: 6.4281, lng: 3.4219 },
              deliveryPin: '5678',
              status: 'pending',
            },
          ],
        },
      ];

      render(
        <VendorMultiBikeMap
          warehouseLocation={{
            address: 'Warehouse Hub Ikeja',
            landmark: 'Ikeja Central Logistics Hub',
            location: { lat: 6.5933, lng: 3.3421 },
          }}
          orders={mockOrders}
        />
      );

      expect(screen.getByText(/Lagos Live Fleet Radar/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Ikeja Central Logistics Hub/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/LGS-112233/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Real-Time Telemetry: 5s Redis Sync/i)).toBeInTheDocument();
    });
  });

  describe('4. Full VendorWorkstationPage & Nav Integration', () => {
    it('renders top brand header, escrow wallet balance, and tab switching', async () => {
      // Mock global fetch for orders
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/v1/vendor/orders')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ orders: [] }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<VendorWorkstationPage />);

      expect(screen.getByText(/Vendor Portal/i)).toBeInTheDocument();
      expect(screen.getByText(/Central Dispatch Hub \(Pickup\)/i)).toBeInTheDocument();

      // Switch to Radar & Manifest tab
      const manifestTab = screen.getByText(/Live Radar & Manifest/i);
      fireEvent.click(manifestTab);

      expect(screen.getByText(/Dispatched Orders Manifest/i)).toBeInTheDocument();
      expect(screen.getByText(/No dispatched orders found/i)).toBeInTheDocument();
    });

    it('navigates to /vendor from DesktopSidebar and DesktopHeader', () => {
      render(
        <DesktopSidebar
          collapsed={false}
          onToggleCollapse={vi.fn()}
          activeTab="dashboard"
          onSelectTab={vi.fn()}
        />
      );

      const bulkCsvSidebarBtn = screen.getByText(/Vendor Bulk CSV/i);
      fireEvent.click(bulkCsvSidebarBtn);
      expect(mockPush).toHaveBeenCalledWith('/vendor');

      cleanup();

      render(
        <DesktopHeader
          onOpenQrScanner={vi.fn()}
          onBookDeliveryClick={vi.fn()}
        />
      );

      const bulkCsvHeaderBtn = screen.getByTitle(/Vendor Bulk Multi-Stop Dispatch/i);
      fireEvent.click(bulkCsvHeaderBtn);
      expect(mockPush).toHaveBeenCalledWith('/vendor');
    });
  });
});
