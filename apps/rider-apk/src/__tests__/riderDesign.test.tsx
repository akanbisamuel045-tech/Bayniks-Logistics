// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { RiderNavigationDrawer } from '../components/RiderNavigationDrawer';
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

  describe('1. RiderNavigationDrawer', () => {
    it('renders rider profile, verified badge, and all workspace navigation items', () => {
      const mockClose = vi.fn();
      const mockSelectView = vi.fn();
      const mockToggleSunlight = vi.fn();

      render(
        <RiderNavigationDrawer
          isOpen={true}
          onClose={mockClose}
          activeView="radar"
          onSelectView={mockSelectView}
          isSunlightMode={false}
          onToggleSunlightMode={mockToggleSunlight}
        />
      );

      // Verify Rider name and verified badge
      expect(screen.getByText('Tariq Danladi')).toBeDefined();
      expect(screen.getByText(/Verified/i)).toBeDefined();
      expect(screen.getByText(/4.95/)).toBeDefined();

      // Verify navigation items
      expect(screen.getByText(/Radar Dispatch Map/i)).toBeDefined();
      expect(screen.getByText(/Shift Earnings & Payouts/i)).toBeDefined();
      expect(screen.getByText(/Customer Live Chat/i)).toBeDefined();
      expect(screen.getByText(/24\/7 Safety & SOS Support/i)).toBeDefined();
      expect(screen.getByText(/Rider Profile & Vehicle/i)).toBeDefined();

      // Click on Shift Earnings
      fireEvent.click(screen.getByText(/Shift Earnings & Payouts/i));
      expect(mockSelectView).toHaveBeenCalledWith('earnings');
    });

    it('toggles sunlight mode when clicked', () => {
      const mockToggleSunlight = vi.fn();

      render(
        <RiderNavigationDrawer
          isOpen={true}
          onClose={vi.fn()}
          activeView="radar"
          onSelectView={vi.fn()}
          isSunlightMode={false}
          onToggleSunlightMode={mockToggleSunlight}
        />
      );

      fireEvent.click(screen.getByText(/Sunlight High-Contrast Mode/i));
      expect(mockToggleSunlight).toHaveBeenCalled();
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
