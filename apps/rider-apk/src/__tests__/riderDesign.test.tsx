// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { RiderNavigationDrawer } from '../components/RiderNavigationDrawer';
import { RiderCockpitMapHome } from '../components/RiderCockpitMapHome';
import { RiderInboxScreen } from '../components/RiderInboxScreen';
import { RiderEarningsSheet } from '../components/RiderEarningsSheet';
import { RiderChatSheet } from '../components/RiderChatSheet';
import { RiderSupportSheet } from '../components/RiderSupportSheet';
import { RiderProfileSheet } from '../components/RiderProfileSheet';
import { ActiveDeliverySheet } from '../components/ActiveDeliverySheet';
import { useRiderStore } from '../store/riderStore';

describe('Rider App Bayniks Design System & Customer Parity Suite', () => {
  beforeEach(() => {
    useRiderStore.setState({
      riderName: 'Tariq Danladi',
      plateNumber: 'KJA-824-XY',
      riderStatus: 'available',
      kycStatus: 'approved',
      tripPhase: 'idle',
      todayEarningsKobo: 3425000, // ₦34,250.00
      currentAccuracy: 3.2,
      batteryLevel: 88,
      isSubmitting: false,
      isNetworkConnected: true,
      pendingOfflinePingsCount: 0,
      activeOrder: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('1. RiderNavigationDrawer (Without Settings & Bonuses)', () => {
    it('renders rider profile, score stats, and workspace menu links without Settings or Campaigns', () => {
      const mockClose = vi.fn();
      const mockSelectView = vi.fn();

      render(
        <RiderNavigationDrawer
          isOpen={true}
          onClose={mockClose}
          activeView="radar"
          onSelectView={mockSelectView}
        />
      );

      // Verify Rider name, courier badge, and score stats
      expect(screen.getByText('Tariq Danladi')).toBeDefined();
      expect(screen.getByText(/BAYNIKS COURIER/i)).toBeDefined();
      expect(screen.getByText(/Driver Score/i)).toBeDefined();
      expect(screen.getByText(/Acceptance rate/i)).toBeDefined();

      // Verify permitted sidebar navigation items
      expect(screen.getByText(/^Earnings$/i)).toBeDefined();
      expect(screen.getByText(/Trip history/i)).toBeDefined();
      expect(screen.getByText(/Scheduled rides/i)).toBeDefined();
      expect(screen.getByText(/Driver Portal/i)).toBeDefined();
      expect(screen.getByText(/Privacy/i)).toBeDefined();

      // Verify Settings, Campaigns, and Bronze bonus tier are removed from sidebar
      expect(screen.queryByTestId('drawer-settings-btn')).toBeNull();
      expect(screen.queryByText(/^Settings$/i)).toBeNull();
      expect(screen.queryByText(/Campaigns/i)).toBeNull();
      expect(screen.queryByText(/Bronze/i)).toBeNull();

      // Click on Earnings
      fireEvent.click(screen.getByText(/^Earnings$/i));
      expect(mockSelectView).toHaveBeenCalledWith('earnings');
    });

    it('renders Cockpit Home and Inbox without any bonus or campaign cards', () => {
      render(
        <>
          <RiderCockpitMapHome
            onOpenDrawer={vi.fn()}
            onOpenSafety={vi.fn()}
            onOpenFullMap={vi.fn()}
            onOpenEarnings={vi.fn()}
            onOpenScheduledOrders={vi.fn()}
          />
          <RiderInboxScreen />
        </>
      );

      expect(screen.queryByText(/MORNING BONUS/i)).toBeNull();
      expect(screen.queryByText(/Weekend Super Bonus/i)).toBeNull();
      expect(screen.queryByText(/View all campaigns/i)).toBeNull();
      expect(screen.queryByText(/^Campaigns$/i)).toBeNull();
      expect(screen.queryByText(/^Rush$/i)).toBeNull();
      expect(screen.getByText(/Trips towards destination/i)).toBeDefined();
      expect(screen.getByText(/Today's earnings/i)).toBeDefined();
    });
  });

  describe('2. RiderEarningsSheet', () => {
    it('displays today earnings in Naira, SLA rating, and triggers instant cashout', () => {
      render(<RiderEarningsSheet isOpen={true} onClose={vi.fn()} />);

      // Earnings formatted to Naira
      expect(screen.getByText('₦34,250.00')).toBeDefined();
      expect(screen.getByText(/99.4%/)).toBeDefined();
      expect(screen.getByText(/Top 1% Tier/i)).toBeDefined();
      expect(screen.getByText(/GTBank • 0123\*\*\*\*89/i)).toBeDefined();

      // Instant cashout button
      const cashoutBtn = screen.getByRole('button', { name: /CASHOUT NOW/i });
      expect(cashoutBtn).toBeDefined();
      fireEvent.click(cashoutBtn);
    });
  });

  describe('3. RiderChatSheet', () => {
    it('renders customer chat, waybill reference, and quick-replies', () => {
      useRiderStore.setState({
        activeOrder: {
          _id: 'ord-123',
          trackingCode: '#473215090',
          status: 'in_transit',
          vehicleType: 'bike',
          paymentMethod: 'wallet',
          totalFareKobo: 250000,
          riderEarningKobo: 200000,
          estimatedDistanceKm: 4.2,
          pickup: {
            address: 'Otigba St, Ikeja',
            landmark: 'Slot',
            location: { lat: 6.5933, lng: 3.3421 },
            contactName: 'Kainul Stevano',
            contactPhone: '+2348021112233',
          },
          stops: [
            {
              sequenceNumber: 1,
              recipientName: 'Kainul Stevano',
              recipientPhone: '+2348021112233',
              dropoffAddress: 'Victoria Island',
              dropoffLandmark: 'Eko Hotel',
              dropoffLocation: { lat: 6.4281, lng: 3.4219 },
              packageDescription: 'Business Documents',
              status: 'pending',
            },
          ],
        },
      });

      render(<RiderChatSheet isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText(/Kainul Stevano/i)).toBeDefined();
      expect(screen.getByText(/Waybill: #473215090/i)).toBeDefined();
      expect(screen.getByText(/I have arrived at your gate \/ entrance/i)).toBeDefined();

      // Click quick reply
      fireEvent.click(screen.getByText(/I have arrived at your gate \/ entrance/i));
    });
  });

  describe('4. RiderSupportSheet', () => {
    it('renders 112 emergency hotline and incident reporting buttons', () => {
      render(<RiderSupportSheet isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText(/POLICE \/ AMBULANCE \(112\)/i)).toBeDefined();
      expect(screen.getByText(/BAYNIKS OPS SOS/i)).toBeDefined();
      expect(screen.getByText(/Bike Breakdown \/ Puncture/i)).toBeDefined();
      expect(screen.getByText(/Severe Rainstorm \/ Flooding/i)).toBeDefined();

      // Trigger incident
      fireEvent.click(screen.getByText(/Bike Breakdown \/ Puncture/i));
      expect(screen.getByText(/Incident Logged!/i)).toBeDefined();
    });
  });

  describe('5. ActiveDeliverySheet Stepper Parity', () => {
    it('renders 4-step progress stepper and customer contact bar matching customer page', () => {
      useRiderStore.setState({
        tripPhase: 'in_transit',
        activeOrder: {
          _id: 'ord-888',
          trackingCode: '#473215090',
          status: 'in_transit',
          vehicleType: 'bike',
          paymentMethod: 'wallet',
          totalFareKobo: 300000,
          riderEarningKobo: 250000,
          estimatedDistanceKm: 4.2,
          pickup: {
            address: 'Commercial Ave, Yaba',
            landmark: 'Beside E-Center',
            location: { lat: 6.5181, lng: 3.3769 },
            contactName: 'Sarah Johnson',
            contactPhone: '+2348011223344',
          },
          stops: [
            {
              sequenceNumber: 1,
              recipientName: 'Michael Chen',
              recipientPhone: '+2348099887766',
              dropoffAddress: 'Victoria Island Towers, Plot 4',
              dropoffLandmark: 'Beside Civic Centre',
              dropoffLocation: { lat: 6.4312, lng: 3.4256 },
              packageDescription: 'Business documents • Express Bike',
              status: 'pending',
            },
          ],
        },
      });

      render(<ActiveDeliverySheet />);

      // Step title & ETA
      expect(screen.getByText(/STEP 3 OF 4 • IN TRANSIT TO DROPOFF/i)).toBeDefined();
      expect(screen.getByText(/Booked/i)).toBeDefined();
      expect(screen.getByText(/Picked Up/i)).toBeDefined();
      expect(screen.getAllByText(/In Transit/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Delivered/i)).toBeDefined();

      // Pickup & Dropoff landmarks
      expect(screen.getByText(/Commercial Ave, Yaba/i)).toBeDefined();
      expect(screen.getByText(/Victoria Island Towers, Plot 4/i)).toBeDefined();
      expect(screen.getAllByText(/Michael Chen/i).length).toBeGreaterThanOrEqual(1);

      // Main CTA button
      expect(screen.getByRole('button', { name: /ARRIVED AT DROPOFF/i })).toBeDefined();
    });
  });
});
