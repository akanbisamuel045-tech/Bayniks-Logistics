/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { GodsEyeFleetMap } from '../components/admin/GodsEyeFleetMap';
import { OrderReassignModal } from '../components/admin/OrderReassignModal';
import { KycApprovalQueue } from '../components/admin/KycApprovalQueue';
import AdminCommandCenterPage from '../app/admin/page';
import { DesktopSidebar } from '../components/DesktopSidebar';
import { DesktopHeader } from '../components/DesktopHeader';
import { FleetBikeTelemetryItem } from '@logistics/shared-types';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
}));

describe('Stage 18: Super-Admin & Fleet Owner Command Center UI', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockBikes: FleetBikeTelemetryItem[] = [
    {
      riderUserId: 'rider-1',
      fullName: 'Tariq Danladi',
      phone: '+2348011112222',
      plateNumber: 'KJA-101-AD',
      status: 'available',
      kycStatus: 'approved',
      lat: 6.5933,
      lng: 3.3421,
      bearing: 90,
      speed: 0,
      isMockLocation: false,
      updatedAt: Date.now(),
    },
    {
      riderUserId: 'rider-2',
      fullName: 'Suleiman Fast',
      phone: '+2348033334444',
      plateNumber: 'KJA-202-BF',
      status: 'busy',
      kycStatus: 'approved',
      lat: 6.4281,
      lng: 3.4219,
      bearing: 180,
      speed: 42,
      isMockLocation: false,
      activeOrderId: 'order-123',
      activeTrackingCode: 'LGS-847291',
      updatedAt: Date.now(),
    },
    {
      riderUserId: 'rider-3',
      fullName: 'Mock Location Spoofer',
      phone: '+2348055556666',
      plateNumber: 'IKJ-999-SP',
      status: 'busy',
      kycStatus: 'approved',
      lat: 6.5186,
      lng: 3.3712,
      bearing: 0,
      speed: 15,
      isMockLocation: true, // FLAG
      activeOrderId: 'order-456',
      activeTrackingCode: 'LGS-999999',
      updatedAt: Date.now(),
    },
  ];

  describe('1. GodsEyeFleetMap Component', () => {
    it('renders radar canvas, bike markers, and filter buttons', () => {
      render(<GodsEyeFleetMap bikes={mockBikes} />);

      expect(screen.getByText(/God's Eye/i)).toBeInTheDocument();
      expect(screen.getByText(/All Bikes \(3\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Available \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/In Transit \(2\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Mock GPS \(1\)/i)).toBeInTheDocument();

      // Verify plate numbers rendered on radar
      expect(screen.getByText('KJA-101-AD')).toBeInTheDocument();
      expect(screen.getByText('KJA-202-BF')).toBeInTheDocument();
      expect(screen.getByText('IKJ-999-SP')).toBeInTheDocument();
    });

    it('filters bikes when filter pills are clicked', () => {
      render(<GodsEyeFleetMap bikes={mockBikes} />);

      // Filter available bikes only
      fireEvent.click(screen.getByText(/Available \(1\)/i));
      expect(screen.getByText('KJA-101-AD')).toBeInTheDocument();
      expect(screen.queryByText('KJA-202-BF')).not.toBeInTheDocument();

      // Filter mock GPS flagged only
      fireEvent.click(screen.getByText(/Mock GPS \(1\)/i));
      expect(screen.getByText('IKJ-999-SP')).toBeInTheDocument();
      expect(screen.queryByText('KJA-101-AD')).not.toBeInTheDocument();
    });

    it('opens quick inspector drawer when a bike marker is clicked', () => {
      const handleReassign = vi.fn();
      render(<GodsEyeFleetMap bikes={mockBikes} onReassignOrder={handleReassign} />);

      const bikeMarker = screen.getByText('KJA-202-BF');
      fireEvent.click(bikeMarker);

      // Verify quick drawer contents
      expect(screen.getByText('Suleiman Fast')).toBeInTheDocument();
      expect(screen.getByText(/Speed: 42 km\/h/i)).toBeInTheDocument();
      expect(screen.getByText(/Order: LGS-847291/i)).toBeInTheDocument();
      expect(screen.getByText(/Mid-Trip Reassign/i)).toBeInTheDocument();

      // Trigger mid-trip reassign button
      fireEvent.click(screen.getByText(/Mid-Trip Reassign/i));
      expect(handleReassign).toHaveBeenCalledWith('order-123', 'LGS-847291', 'rider-2');
    });
  });

  describe('2. OrderReassignModal Component', () => {
    it('lists available candidate couriers and submits emergency reassignment', async () => {
      const handleSuccess = vi.fn();
      const handleClose = vi.fn();

      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              message: 'Order successfully reassigned to new rider',
              order: { _id: 'order-123', trackingCode: 'LGS-847291', riderId: 'rider-1' },
            }),
        })
      );

      render(
        <OrderReassignModal
          orderId="order-123"
          trackingCode="LGS-847291"
          currentRiderId="rider-2"
          availableBikes={mockBikes}
          isOpen={true}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      );

      expect(screen.getByText(/Emergency Mid-Trip Reassignment/i)).toBeInTheDocument();
      expect(screen.getByText(/Waybill: LGS-847291/i)).toBeInTheDocument();

      // Rider 1 is available and approved
      expect(screen.getByText('Tariq Danladi')).toBeInTheDocument();

      // Select Rider 1
      fireEvent.click(screen.getByText('Tariq Danladi'));

      // Submit reassignment
      const confirmBtn = screen.getByRole('button', { name: /Confirm Emergency Reassignment/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(handleSuccess).toHaveBeenCalledTimes(1);
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('3. KycApprovalQueue Component', () => {
    const mockApplicants = [
      {
        id: 'prof-1',
        riderUserId: 'user-app-1',
        fullName: 'Ibrahim Olatunji',
        phone: '+2348123334444',
        email: 'ibrahim@test.com',
        plateNumber: 'APP-505-LG',
        ridersCardNumber: 'CARD-505',
        ridersCardDocumentUrl: 'https://cdn.bayniks.com/card505.pdf',
        kycStatus: 'pending',
        createdAt: new Date().toISOString(),
      },
    ];

    it('renders applicants and handles 1-click KYC approval', async () => {
      const handleSuccess = vi.fn();

      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              message: "Rider KYC status updated to 'approved'",
              profile: { kycStatus: 'approved' },
            }),
        })
      );

      render(<KycApprovalQueue applicants={mockApplicants} onReviewSuccess={handleSuccess} />);

      expect(screen.getByText('Ibrahim Olatunji')).toBeInTheDocument();
      expect(screen.getByText('APP-505-LG')).toBeInTheDocument();
      expect(screen.getByText(/View Document/i)).toBeInTheDocument();

      // Click Approve
      const approveBtn = screen.getByRole('button', { name: /Approve/i });
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/v1/admin/kyc/prof-1',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ decision: 'approved' }),
          })
        );
        expect(handleSuccess).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('4. Full AdminCommandCenterPage & Nav Integration', () => {
    it('renders top metric cards, tab navigation, and live telemetry indicators', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/v1/admin/fleet/live')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                onlineCount: 8,
                busyCount: 3,
                mockLocationFlaggedCount: 1,
                pendingKycCount: 2,
                bikes: mockBikes,
              }),
          });
        }
        if (url.includes('/api/v1/admin/kyc/pending')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ pendingCount: 0, riders: [] }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<AdminCommandCenterPage />);

      // Verify top brand & title
      expect(screen.getByText(/Command Center/i)).toBeInTheDocument();
      expect(screen.getByText(/Redis 5s Telemetry Engine/i)).toBeInTheDocument();

      // Verify metrics
      await waitFor(() => {
        expect(screen.getByText('Online Couriers')).toBeInTheDocument();
        expect(screen.getByText('In-Transit Couriers')).toBeInTheDocument();
        expect(screen.getByText('Mock GPS Spoof Flags')).toBeInTheDocument();
      });

      // Switch to KYC tab
      const kycTab = screen.getByText(/Rider KYC Queue/i);
      fireEvent.click(kycTab);
      expect(screen.getByText(/Verification queue clean/i)).toBeInTheDocument();

      // Switch to Active Interventions tab
      const ordersTab = screen.getByText(/Active Interventions/i);
      fireEvent.click(ordersTab);
      expect(screen.getByText(/Active Order Intervention & Breakdown Command/i)).toBeInTheDocument();
    });

    it('navigates to /admin from DesktopSidebar and DesktopHeader', () => {
      render(
        <DesktopSidebar
          collapsed={false}
          onToggleCollapse={vi.fn()}
          activeTab="dashboard"
          onSelectTab={vi.fn()}
        />
      );

      const commandSidebarBtn = screen.getByText(/Command Center/i);
      fireEvent.click(commandSidebarBtn);
      expect(mockPush).toHaveBeenCalledWith('/admin');

      cleanup();

      render(
        <DesktopHeader
          onOpenQrScanner={vi.fn()}
          onBookDeliveryClick={vi.fn()}
        />
      );

      const commandHeaderBtn = screen.getByTitle(/Super-Admin & Fleet Command Center/i);
      fireEvent.click(commandHeaderBtn);
      expect(mockPush).toHaveBeenCalledWith('/admin');
    });
  });
});

