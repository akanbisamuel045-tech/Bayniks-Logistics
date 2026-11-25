// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { RiderCockpitMapHome } from '../components/RiderCockpitMapHome';
import { useRiderStore } from '../store/riderStore';

vi.mock('../utils/audioChimes', () => ({
  playKeypadChime: vi.fn(),
  playMissionAcceptChime: vi.fn(),
  playSuccessChime: vi.fn(),
  playAlertChime: vi.fn(),
}));

const SAMPLE_OFFER = {
  orderId: 'ord-warri-001',
  trackingCode: 'BNX-78102',
  pickupAddress: '78 Airport Road, Warri 330102',
  pickupLandmark: 'Opposite Delta Mall, Effurun Roundabout, Warri, Nigeria',
  estimatedDistanceKm: 0.2,
  riderEarningKobo: 50000,
  expiresAt: Date.now() + 30000,
  stopsCount: 1,
};

describe('Delivery Workflow Redesign (Video-Exact End-to-End Flow + Black & Atomic Orange)', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    act(() => {
      useRiderStore.setState({
        isLoggedIn: true,
        riderStatus: 'offline',
        tripPhase: 'idle',
        activeOrder: null,
        incomingOffer: null,
        autoConfirm: false,
        dispatchRadiusKm: 2,
        waitingSecondsLeft: 300,
        isDestinationUpdated: false,
        tripPriceConfirmation: null,
        toastMessage: null,
      });
    });
  });

  it('transitions Offline -> Online top Go offline bar & catchment radar', () => {
    render(
      <RiderCockpitMapHome
        onOpenDrawer={vi.fn()}
        onOpenSafety={vi.fn()}
        onOpenFullMap={vi.fn()}
        onOpenEarnings={vi.fn()}
        onOpenScheduledOrders={vi.fn()}
      />
    );

    const onlineBar = screen.getByTestId('bolt-online-toggle-bar');
    expect(onlineBar.textContent).toContain('Go online');
    fireEvent.click(onlineBar);

    expect(useRiderStore.getState().riderStatus).toBe('available');
    expect(screen.getByTestId('bolt-online-toggle-bar').textContent).toContain('Go offline');
    expect(screen.getByText('2 KM')).toBeDefined();
  });

  it('walks complete active delivery flow: Offer -> Arriving Now -> Waiting -> Start Trip -> Route Change -> End Trip -> Confirm Price -> Rate Passenger', async () => {
    render(
      <RiderCockpitMapHome
        onOpenDrawer={vi.fn()}
        onOpenSafety={vi.fn()}
        onOpenFullMap={vi.fn()}
        onOpenEarnings={vi.fn()}
        onOpenScheduledOrders={vi.fn()}
      />
    );

    // 1. Incoming dispatch offer appears
    act(() => {
      useRiderStore.setState({ riderStatus: 'available', incomingOffer: SAMPLE_OFFER });
    });
    expect(screen.getByTestId('incoming-offer-card')).toBeDefined();
    expect(screen.getByTestId('offer-decline-pill')).toBeDefined();
    expect(screen.getByText(/78 Airport Road, Warri 330102/)).toBeDefined();
    expect(screen.getByText(/Cash/)).toBeDefined();

    // Accept offer -> Arriving at pickup
    await act(async () => {
      fireEvent.click(screen.getByTestId('offer-accept-btn'));
    });

    expect(useRiderStore.getState().tripPhase).toBe('arriving_pickup');
    expect(screen.getByTestId('banner-auto-confirmed')).toBeDefined();
    expect(screen.getByTestId('arriving-now-btn')).toBeDefined();

    // 2. Arriving Now -> Waiting at pickup timer
    await act(async () => {
      fireEvent.click(screen.getByTestId('arriving-now-btn'));
    });

    expect(useRiderStore.getState().tripPhase).toBe('at_pickup');
    expect(screen.getByTestId('waiting-timer-badge').textContent).toContain('05:00 Waiting');
    expect(screen.getByTestId('start-trip-btn')).toBeDefined();

    // 3. Start Trip -> In Transit with Cash badge & Route details
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-trip-btn'));
    });

    expect(useRiderStore.getState().tripPhase).toBe('in_transit');
    expect(screen.getByTestId('active-cash-badge')).toBeDefined();
    expect(screen.getByTestId('end-trip-btn')).toBeDefined();

    // Open Route details and trigger mid-trip destination change + Contact options
    fireEvent.click(screen.getByTestId('route-details-toggle-btn'));
    expect(screen.getByTestId('route-details-sheet')).toBeDefined();
    fireEvent.click(screen.getByTestId('route-change-dest-btn'));
    expect(screen.getByTestId('banner-route-updated')).toBeDefined();
    expect(screen.getByText('3 min')).toBeDefined();

    fireEvent.click(screen.getByTestId('route-details-toggle-btn'));
    fireEvent.click(screen.getByTestId('route-contact-passenger-btn'));
    expect(screen.getByTestId('contact-options-sheet')).toBeDefined();
    expect(screen.getByText('Send a message')).toBeDefined();
    expect(screen.getByText('Call in-app')).toBeDefined();
    expect(screen.getByText('Call by phone')).toBeDefined();
    fireEvent.click(within(screen.getByTestId('contact-options-sheet')).getByLabelText('Close'));

    // 4. End Trip -> Confirm Price Full-Screen View
    await act(async () => {
      fireEvent.click(screen.getByTestId('end-trip-btn'));
    });

    const confirmModal = screen.getByTestId('confirm-price-modal');
    expect(confirmModal).toBeDefined();
    expect(within(confirmModal).getByText('Confirm Price')).toBeDefined();
    expect(within(confirmModal).getByText('Trip with compensation')).toBeDefined();
    expect(within(confirmModal).getByText('₦ 400.00')).toBeDefined();
    expect(within(confirmModal).getByText('Bayniks will compensate you')).toBeDefined();

    // 5. Confirm Price -> Rate Passenger with conditional <4 star issue reasons
    fireEvent.click(screen.getByTestId('confirm-price-submit-btn'));
    const rateModal = screen.getByTestId('rate-passenger-modal');
    expect(rateModal).toBeDefined();
    expect(within(rateModal).queryByTestId('low-rating-reasons')).toBeNull();

    fireEvent.click(within(rateModal).getByLabelText('3 Star'));
    const reasons = within(rateModal).getByTestId('low-rating-reasons');
    expect(reasons).toBeDefined();
    expect(within(reasons).getByText('Passenger did not pay for the trip')).toBeDefined();
    expect(within(reasons).getByText('Passenger was misbehaving')).toBeDefined();
    expect(within(reasons).getByText('Passenger messed up my car')).toBeDefined();

    fireEvent.click(within(reasons).getByText('Passenger was misbehaving'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('rate-passenger-confirm-btn'));
    });

    expect(screen.queryByTestId('rate-passenger-modal')).toBeNull();
  });

  it('contains zero green/blue color classes or Bolt strings across delivery workflow files', () => {
    const filesToCheck = [
      '../components/RiderCockpitMapHome.tsx',
      '../components/sheets/ConfirmPriceModal.tsx',
      '../components/sheets/RatePassengerModal.tsx',
      '../components/sheets/ContactOptionsSheet.tsx',
      '../components/sheets/DestinationModeSheet.tsx',
      '../components/sheets/SurgePromptModal.tsx',
      '../components/NavigationOverlayModal.tsx',
      '../components/RiderChatSheet.tsx',
    ];

    const forbiddenTailwind = /\b(bg|text|border|ring|shadow)-(emerald|green|teal|blue|sky|cyan|indigo)-/i;
    const forbiddenHex = /#00A859|#2563EB|#3B82F6|#15803D|#10B981|#059669/i;

    for (const rel of filesToCheck) {
      const content = fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
      expect(content).not.toMatch(forbiddenTailwind);
      expect(content).not.toMatch(forbiddenHex);
      expect(content).not.toMatch(/\bBolt\b/);
    }
  });
});
