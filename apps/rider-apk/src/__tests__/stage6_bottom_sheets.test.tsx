// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DispatchOfferSheet } from '../components/sheets/DispatchOfferSheet';
import { HandoverVerifySheet } from '../components/sheets/HandoverVerifySheet';
import { useRiderStore } from '../store/riderStore';

describe('Stage 6: Bottom Sheet Modals & Dual Proof-of-Delivery Verification', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useRiderStore.setState({
      riderStatus: 'available',
      tripPhase: 'idle',
      activeOrder: null,
      incomingOffer: null,
      todayEarningsKobo: 1845000,
      tripsCompletedToday: 8,
      toastMessage: null,
    });
  });

  describe('DispatchOfferSheet (30s Acceptance Gate)', () => {
    it('does not render when isOpen is false', () => {
      render(
        <DispatchOfferSheet
          isOpen={false}
          onAccept={vi.fn()}
          onDecline={vi.fn()}
        />
      );
      expect(screen.queryByTestId('sheet-dispatch-offer')).toBeNull();
    });

    it('renders all offer details, 30s countdown pill, and action buttons when open', () => {
      useRiderStore.setState({
        incomingOffer: {
          orderId: 'ord-offer-99',
          trackingCode: '#BF-48291',
          pickupAddress: '14 Commercial Ave, Yaba • 1.1 km away',
          pickupLandmark: 'Kuchi Empire',
          estimatedDistanceKm: 4.8,
          riderEarningKobo: 320000,
          stopsCount: 1,
          expiresAt: Date.now() + 30000,
        },
      });

      const handleAccept = vi.fn();
      const handleDecline = vi.fn();

      render(
        <DispatchOfferSheet
          isOpen={true}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      );

      expect(screen.getByTestId('sheet-dispatch-offer')).toBeDefined();
      expect(screen.getByText(/New delivery request/i)).toBeDefined();
      expect(screen.getByText(/New trip/i)).toBeDefined();
      expect(screen.getByTestId('offer-countdown-pill').textContent).toContain('30s');
      expect(screen.getByText(/Kuchi Empire/i)).toBeDefined();
      expect(screen.getByText(/Victoria Island Towers/i)).toBeDefined();
      expect(screen.getByText(/Sealed Tech & Fashion Parcel/i)).toBeDefined();
      expect(screen.getByText(/4.5 kg/i)).toBeDefined();
      expect(screen.getByText(/4.8 km/i)).toBeDefined();
      expect(screen.getByText(/18 min/i)).toBeDefined();
      expect(screen.getByText(/₦3,200/i)).toBeDefined();

      const acceptBtn = screen.getByTestId('offer-accept-btn');
      fireEvent.click(acceptBtn);
      expect(handleAccept).toHaveBeenCalledTimes(1);

      const declineBtn = screen.getByTestId('offer-decline-btn');
      fireEvent.click(declineBtn);
      expect(handleDecline).toHaveBeenCalledTimes(1);
    });
  });

  describe('HandoverVerifySheet (Dual QR & OTP Proof-of-Delivery)', () => {
    it('does not render when isOpen is false', () => {
      render(<HandoverVerifySheet isOpen={false} onClose={vi.fn()} />);
      expect(screen.queryByTestId('sheet-handover-verify')).toBeNull();
    });

    it('renders segmented mode selector and opens in QR scanner mode by default', () => {
      const handleClose = vi.fn();
      render(<HandoverVerifySheet isOpen={true} onClose={handleClose} />);

      expect(screen.getByTestId('sheet-handover-verify')).toBeDefined();
      expect(screen.getByText(/PROOF OF DELIVERY/i)).toBeDefined();
      expect(screen.getByText(/Verify Package Handover/i)).toBeDefined();

      expect(screen.getByTestId('seg-qr-btn')).toBeDefined();
      expect(screen.getByTestId('seg-otp-btn')).toBeDefined();

      // QR mode elements
      expect(screen.getByTestId('pane-qr-scanner')).toBeDefined();
      expect(screen.getByTestId('qr-camera-frame')).toBeDefined();
      expect(screen.getByTestId('qr-white-matrix')).toBeDefined();

      // Torch toggle
      const torchBtn = screen.getByTestId('torch-toggle-btn');
      expect(torchBtn.textContent).toContain('Torch: OFF');
      fireEvent.click(torchBtn);
      expect(torchBtn.textContent).toContain('Torch: ON');
      expect(screen.getByTestId('qr-camera-frame').classList.contains('torch-active')).toBe(true);

      // Close button
      const closeBtn = screen.getByTestId('verify-close-btn');
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('verifies delivery via QR scan button, credits wallet, and completes trip', () => {
      useRiderStore.setState({
        riderStatus: 'busy',
        tripPhase: 'at_dropoff',
        activeOrder: {
          _id: 'ord-verify-1',
          trackingCode: '#BF-48291',
          status: 'at_dropoff',
          vehicleType: 'bike',
          paymentMethod: 'wallet',
          totalFareKobo: 320000,
          riderEarningKobo: 320000,
          estimatedDistanceKm: 4.8,
          pickup: {
            address: 'Yaba',
            landmark: 'Tech Hub',
            location: { lat: 6.5, lng: 3.3 },
            contactName: 'Sender',
            contactPhone: '+23480000000',
          },
          stops: [
            {
              sequenceNumber: 1,
              recipientName: 'Sarah Jenkins',
              recipientPhone: '+2348034445566',
              dropoffAddress: 'Victoria Island',
              dropoffLandmark: 'Towers',
              dropoffLocation: { lat: 6.4, lng: 3.4 },
              packageDescription: 'Box',
              status: 'pending',
            },
          ],
        },
      });

      const handleVerified = vi.fn();
      const handleClose = vi.fn();

      render(
        <HandoverVerifySheet
          isOpen={true}
          onClose={handleClose}
          onVerified={handleVerified}
          initialMode="qr"
        />
      );

      const qrSubmitBtn = screen.getByTestId('btn-verify-qr-submit');
      fireEvent.click(qrSubmitBtn);

      expect(handleVerified).toHaveBeenCalledWith('QR Code Scanned ✓');
      expect(handleClose).toHaveBeenCalledTimes(1);
      expect(useRiderStore.getState().tripPhase).toBe('idle');
      expect(useRiderStore.getState().riderStatus).toBe('available');
    });

    it('switches to OTP keypad mode, accepts digits via tactile keypad, and verifies code', () => {
      useRiderStore.setState({
        riderStatus: 'busy',
        tripPhase: 'at_dropoff',
        activeOrder: {
          _id: 'ord-verify-2',
          trackingCode: '#BF-48291',
          status: 'at_dropoff',
          vehicleType: 'bike',
          paymentMethod: 'wallet',
          totalFareKobo: 320000,
          riderEarningKobo: 320000,
          estimatedDistanceKm: 4.8,
          pickup: {
            address: 'Yaba',
            landmark: 'Tech Hub',
            location: { lat: 6.5, lng: 3.3 },
            contactName: 'Sender',
            contactPhone: '+23480000000',
          },
          stops: [
            {
              sequenceNumber: 1,
              recipientName: 'Sarah Jenkins',
              recipientPhone: '+2348034445566',
              dropoffAddress: 'Victoria Island',
              dropoffLandmark: 'Towers',
              dropoffLocation: { lat: 6.4, lng: 3.4 },
              packageDescription: 'Box',
              status: 'pending',
            },
          ],
        },
      });

      const handleVerified = vi.fn();
      render(
        <HandoverVerifySheet
          isOpen={true}
          onClose={vi.fn()}
          onVerified={handleVerified}
          initialMode="qr"
        />
      );

      // Switch to OTP mode
      const otpTab = screen.getByTestId('seg-otp-btn');
      fireEvent.click(otpTab);

      expect(screen.getByTestId('pane-otp-keypad')).toBeDefined();
      expect(screen.getByText(/Recipient PIN Hint: 7482/i)).toBeDefined();

      // Tap digits 7, 4, 8, 2
      fireEvent.click(screen.getByTestId('pad-key-7'));
      fireEvent.click(screen.getByTestId('pad-key-4'));
      fireEvent.click(screen.getByTestId('pad-key-8'));
      fireEvent.click(screen.getByTestId('pad-key-2'));

      expect(screen.getByTestId('otp-slot-0').textContent).toBe('7');
      expect(screen.getByTestId('otp-slot-1').textContent).toBe('4');
      expect(screen.getByTestId('otp-slot-2').textContent).toBe('8');
      expect(screen.getByTestId('otp-slot-3').textContent).toBe('2');

      // Test backspace
      fireEvent.click(screen.getByTestId('pad-key-backspace'));
      expect(screen.getByTestId('otp-slot-3').textContent).toBe('•');

      // Re-enter 2
      fireEvent.click(screen.getByTestId('pad-key-2'));
      expect(screen.getByTestId('otp-slot-3').textContent).toBe('2');

      // Submit OTP
      const submitOtpBtn = screen.getByTestId('btn-verify-otp-submit');
      fireEvent.click(submitOtpBtn);

      expect(handleVerified).toHaveBeenCalledWith('OTP 7482 Verified ✓');
      expect(useRiderStore.getState().tripPhase).toBe('idle');
    });
  });
});
