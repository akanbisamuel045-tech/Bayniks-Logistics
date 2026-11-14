// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PinVerificationModal } from '../components/PinVerificationModal';
import { TopTelemetryBar } from '../components/TopTelemetryBar';
import { useRiderStore } from '../store/riderStore';

describe('Rider App Critical Bug Fixes Suite', () => {
  beforeEach(() => {
    useRiderStore.setState({
      riderStatus: 'available',
      tripPhase: 'idle',
      incomingOffer: null,
      activeOrder: null,
      todayEarningsKobo: 250000,
      currentAccuracy: 3.2,
      batteryLevel: 88,
      plateNumber: 'KJA-824-XY',
      isSubmitting: false,
      isNetworkConnected: true,
      pendingOfflinePingsCount: 0,
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Bug Fix 1: Anti-Fraud PIN State Leak Prevention', () => {
    it('clears pinDigits when switching mode from pickup to dropoff', async () => {
      const mockSubmitPickup = vi.fn();
      const mockSubmitDelivery = vi.fn();
      const mockClose = vi.fn();

      const { rerender } = render(
        <PinVerificationModal
          isOpen={true}
          mode="pickup"
          onClose={mockClose}
          onSubmitPickupPin={mockSubmitPickup}
          onSubmitDeliveryPinAndPod={mockSubmitDelivery}
        />
      );

      // Verify pickup mode is active
      expect(screen.getByText(/ANTI-FRAUD PICKUP VERIFICATION/i)).toBeDefined();

      // Initially all 4 digits are placeholder dots '•'
      expect(screen.getAllByText('•').length).toBe(4);

      // Enter 4 digits (e.g. 1, 2, 3, 4)
      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      fireEvent.click(screen.getByRole('button', { name: '3' }));
      fireEvent.click(screen.getByRole('button', { name: '4' }));

      // PIN input dots should be filled (no '•' remaining)
      expect(screen.queryAllByText('•').length).toBe(0);
      expect(screen.getAllByText('1').length).toBe(2); // One in box, one in keypad

      // Now re-render with mode='dropoff' (simulating transition to delivery handover)
      rerender(
        <PinVerificationModal
          isOpen={true}
          mode="dropoff"
          recipientName="Babatunde"
          onClose={mockClose}
          onSubmitPickupPin={mockSubmitPickup}
          onSubmitDeliveryPinAndPod={mockSubmitDelivery}
        />
      );

      // Verify dropoff mode is active
      expect(screen.getByText(/STOP #1 PROOF OF DELIVERY/i)).toBeDefined();

      // The entered PIN must be completely wiped clean: all 4 placeholder dots '•' are restored!
      expect(screen.getAllByText('•').length).toBe(4);

      // Submit button must be disabled for empty PIN
      const submitBtn = screen.getByRole('button', { name: /CONFIRM POD • COMPLETE DELIVERY/i });
      expect(submitBtn.hasAttribute('disabled')).toBe(true);
    });

    it('clears pinDigits when modal closes and reopens', async () => {
      const mockClose = vi.fn();

      const { rerender } = render(
        <PinVerificationModal
          isOpen={true}
          mode="pickup"
          onClose={mockClose}
          onSubmitPickupPin={vi.fn()}
          onSubmitDeliveryPinAndPod={vi.fn()}
        />
      );

      // Enter 2 digits
      fireEvent.click(screen.getByRole('button', { name: '9' }));
      fireEvent.click(screen.getByRole('button', { name: '8' }));

      // 2 digits entered, 2 dots remain
      expect(screen.getAllByText('•').length).toBe(2);

      // Close modal
      rerender(
        <PinVerificationModal
          isOpen={false}
          mode="pickup"
          onClose={mockClose}
          onSubmitPickupPin={vi.fn()}
          onSubmitDeliveryPinAndPod={vi.fn()}
        />
      );

      // Reopen modal
      rerender(
        <PinVerificationModal
          isOpen={true}
          mode="pickup"
          onClose={mockClose}
          onSubmitPickupPin={vi.fn()}
          onSubmitDeliveryPinAndPod={vi.fn()}
        />
      );

      // Should be reset to all 4 dots
      expect(screen.getAllByText('•').length).toBe(4);
      const submitBtn = screen.getByRole('button', { name: /VERIFY PIN • START TRIP/i });
      expect(submitBtn.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Bug Fix 2: Telemetry Sync Status Alignment', () => {
    it('displays STANDBY • Offline when rider is offline even if browser has network connection', () => {
      // Set rider status to offline while network is connected
      useRiderStore.setState({
        riderStatus: 'offline',
        isNetworkConnected: true,
      });

      render(<TopTelemetryBar />);

      // The status button must show OFFLINE
      expect(screen.getByRole('button', { name: /OFFLINE/i })).toBeDefined();

      // The sync diagnostic badge must show STANDBY • Offline, NOT ONLINE • Synced
      expect(screen.getByText(/STANDBY • Offline/i)).toBeDefined();
      expect(screen.queryByText(/ONLINE • Synced/i)).toBeNull();
    });

    it('displays DISPATCH • Synced when rider is online and network is healthy', () => {
      useRiderStore.setState({
        riderStatus: 'available',
        isNetworkConnected: true,
        pendingOfflinePingsCount: 0,
      });

      render(<TopTelemetryBar />);

      expect(screen.getByRole('button', { name: /ONLINE/i })).toBeDefined();
      expect(screen.getByText(/DISPATCH • Synced/i)).toBeDefined();
    });

    it('displays NET LAG when pings are queued offline', () => {
      useRiderStore.setState({
        riderStatus: 'available',
        isNetworkConnected: false,
        pendingOfflinePingsCount: 3,
      });

      render(<TopTelemetryBar />);

      expect(screen.getByText(/NET LAG • 3 Queued/i)).toBeDefined();
    });
  });
});
