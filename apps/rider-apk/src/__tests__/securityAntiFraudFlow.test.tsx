// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, within, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { RiderCockpitMapHome } from '../components/RiderCockpitMapHome';
import { useRiderStore } from '../store/riderStore';

vi.mock('../components/map/BayniksLiveMap', () => ({
  BayniksLiveMap: () => <div data-testid="mock-bayniks-live-map" />,
}));

vi.mock('../utils/locationSearch', async () => {
  const actual = await vi.importActual<any>('../utils/locationSearch');
  return {
    ...actual,
    requestRealDeviceLocation: vi.fn(async () => ({
      lat: 6.5568,
      lng: 3.3489,
      accuracy: 10,
      speed: 0,
      heading: 0,
    })),
    watchRealDeviceLocation: vi.fn(() => () => {}),
  };
});

describe('Security & Anti-Fraud Flow Enforcement (ARCHITECTURE.md)', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useRiderStore.setState({
      riderStatus: 'available',
      tripPhase: 'at_pickup',
      simulationMode: true,
      isNetworkConnected: true,
      tripPriceConfirmation: null,
      incomingOffer: null,
      activeOrder: {
        orderId: 'ORD-SEC-101',
        customerId: 'CUST-101',
        vehicleType: 'bike',
        status: 'at_pickup',
        pickup: {
          location: { lat: 6.5568, lng: 3.3489 },
          address: '78 Airport Road, Warri',
          landmark: 'Beside Delta Mall',
        },
        stops: [
          {
            stopId: 'STOP-1',
            sequenceNumber: 1,
            dropoffLocation: { lat: 6.5882, lng: 3.368 },
            dropoffAddress: 'Shoprite Delta Mall, Warri',
            recipientName: 'Ebi',
            recipientPhone: '+2348034445566',
            status: 'pending',
          },
        ],
        pricing: {
          currency: 'NGN',
          baseFareKobo: 40000,
          distanceFareKobo: 0,
          surgeMultiplier: 1,
          totalFareKobo: 50000,
          platformFeeKobo: 7500,
          riderPayoutKobo: 42500,
        },
        payment: { method: 'cash', status: 'pending' },
      } as any,
    });
  });

  it('blocks Start Trip until valid 4-digit Sender Pickup PIN is submitted and rejects 0000', async () => {
    render(
      <RiderCockpitMapHome
        onOpenDrawer={() => {}}
        onOpenSafety={() => {}}
        onOpenFullMap={() => {}}
        onOpenEarnings={() => {}}
        onOpenScheduledOrders={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('start-trip-btn'));
    const modal = screen.getByTestId('pin-verification-modal');
    expect(within(modal).getByText('ANTI-FRAUD PICKUP VERIFICATION')).toBeDefined();

    // Enter test rejection PIN 0000 -> must stay locked at at_pickup and surface error banner
    for (let i = 0; i < 4; i++) {
      fireEvent.click(within(modal).getByRole('button', { name: '0' }));
    }
    await act(async () => {
      fireEvent.click(within(modal).getByTestId('pin-submit-btn'));
    });

    expect(useRiderStore.getState().tripPhase).toBe('at_pickup');
    expect(within(modal).getByTestId('pin-error-banner').textContent).toContain(
      'Invalid sender pickup PIN'
    );

    // Clear and enter valid 4-digit PIN 4829 -> transitions to in_transit
    fireEvent.click(within(modal).getByRole('button', { name: 'Clear' }));
    for (const d of ['4', '8', '2', '9']) {
      fireEvent.click(within(modal).getByRole('button', { name: d }));
    }
    await act(async () => {
      fireEvent.click(within(modal).getByTestId('pin-submit-btn'));
    });

    expect(useRiderStore.getState().tripPhase).toBe('in_transit');
    expect(screen.queryByTestId('pin-verification-modal')).toBeNull();
  });

  it('requires <300KB POD photo AND valid 4-digit Delivery PIN before completing delivery, and records pinUsed', async () => {
    useRiderStore.setState({
      tripPhase: 'in_transit',
      deliveryHistory: [],
    });

    render(
      <RiderCockpitMapHome
        onOpenDrawer={() => {}}
        onOpenSafety={() => {}}
        onOpenFullMap={() => {}}
        onOpenEarnings={() => {}}
        onOpenScheduledOrders={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('end-trip-btn'));
    const modal = screen.getByTestId('pin-verification-modal');
    expect(within(modal).getByText('STOP #1 PROOF OF DELIVERY')).toBeDefined();

    // Enter 4 digits without uploading POD photo -> submit must remain disabled
    for (const d of ['7', '4', '8', '2']) {
      fireEvent.click(within(modal).getByRole('button', { name: d }));
    }
    expect((within(modal).getByTestId('pin-submit-btn') as HTMLButtonElement).disabled).toBe(true);

    // Upload POD photo -> compresses <= 300KB and enables submit
    const podFile = new File(['pod-delivery-proof'], 'proof.jpg', { type: 'image/jpeg' });
    await act(async () => {
      fireEvent.change(within(modal).getByTestId('pod-photo-input'), {
        target: { files: [podFile] },
      });
    });

    expect(within(modal).getByTestId('pod-photo-compressed-badge')).toBeDefined();
    expect((within(modal).getByTestId('pin-submit-btn') as HTMLButtonElement).disabled).toBe(false);

    // Test invalid PIN '0000' rejection with valid POD photo
    fireEvent.click(within(modal).getByRole('button', { name: 'Clear' }));
    for (let i = 0; i < 4; i++) {
      fireEvent.click(within(modal).getByRole('button', { name: '0' }));
    }
    await act(async () => {
      fireEvent.click(within(modal).getByTestId('pin-submit-btn'));
    });

    expect(useRiderStore.getState().tripPhase).toBe('in_transit');
    expect(within(modal).getByTestId('pin-error-banner').textContent).toContain(
      'Invalid delivery PIN'
    );

    // Replace with valid PIN 7482 -> completes delivery & opens Confirm Price modal
    fireEvent.click(within(modal).getByRole('button', { name: 'Clear' }));
    for (const d of ['7', '4', '8', '2']) {
      fireEvent.click(within(modal).getByRole('button', { name: d }));
    }
    await act(async () => {
      fireEvent.click(within(modal).getByTestId('pin-submit-btn'));
    });

    expect(screen.queryByTestId('pin-verification-modal')).toBeNull();
    expect(screen.getByTestId('confirm-price-modal')).toBeDefined();
    expect(useRiderStore.getState().deliveryHistory[0]?.pinUsed).toBe('7482');
  });

  it('rejects oversized >300KB POD payloads in store verifyDeliveryPin guard', async () => {
    const oversizedBytes = 310 * 1024;
    const res = await useRiderStore
      .getState()
      .verifyDeliveryPin('7482', 'data:image/jpeg;base64,abc', oversizedBytes);

    expect(res.success).toBe(false);
    expect(res.error).toContain('300KB');
  });

  it('triggers onOpenSafety from active delivery Route details sheet', () => {
    useRiderStore.setState({ tripPhase: 'in_transit' });
    const onOpenSafetySpy = vi.fn();

    render(
      <RiderCockpitMapHome
        onOpenDrawer={() => {}}
        onOpenSafety={onOpenSafetySpy}
        onOpenFullMap={() => {}}
        onOpenEarnings={() => {}}
        onOpenScheduledOrders={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('route-details-toggle-btn'));
    const routeSheet = screen.getByTestId('route-details-sheet');
    fireEvent.click(within(routeSheet).getByTestId('route-emergency-sos-btn'));

    expect(onOpenSafetySpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('route-details-sheet')).toBeNull();
  });

  it('uses strict Black + Atomic Orange theme with zero green/blue Tailwind classes in PinVerificationModal and RiderSupportSheet', () => {
    const forbiddenTailwind = /\b(bg|text|border|ring|shadow)-(emerald|green|teal|blue|sky|cyan|indigo)-/i;
    const files = [
      '../components/PinVerificationModal.tsx',
      '../components/RiderSupportSheet.tsx',
    ];

    for (const rel of files) {
      const content = fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
      expect(content).not.toMatch(forbiddenTailwind);
    }
  });
});

