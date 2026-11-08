import { describe, it, expect, beforeEach } from 'vitest';
import { useRiderStore } from '../store/riderStore';
import type { JobNewOffer } from '@logistics/shared-types';

describe('Stage 11: Dispatch Rider SPA UI & Job State Machine', () => {
  const sampleOffer: JobNewOffer = {
    orderId: 'test-order-001',
    trackingCode: 'LGS-TEST-881',
    pickupAddress: 'Computer Village, Awolowo Way, Ikeja',
    pickupLandmark: 'Beside BRT Under Bridge',
    estimatedDistanceKm: 3.5,
    riderEarningKobo: 180000, // ₦1,800.00
    stopsCount: 1,
    expiresAt: Date.now() + 30000,
  };

  beforeEach(() => {
    // Reset store to known baseline state before each test
    useRiderStore.setState({
      riderStatus: 'available',
      tripPhase: 'idle',
      incomingOffer: null,
      offerSecondsLeft: 30,
      activeOrder: null,
      todayEarningsKobo: 1000000, // ₦10,000.00
      isSubmitting: false,
      simulationMode: true,
      authToken: null,
    });
  });

  it('initializes with available status and idle trip phase', () => {
    const state = useRiderStore.getState();
    expect(state.riderStatus).toBe('available');
    expect(state.tripPhase).toBe('idle');
    expect(state.incomingOffer).toBeNull();
    expect(state.activeOrder).toBeNull();
    expect(state.todayEarningsKobo).toBe(1000000);
  });

  it('toggles online/offline status, but forbids going offline while busy on a job', async () => {
    const store = useRiderStore.getState();

    // Available -> Offline
    await store.toggleOnlineStatus();
    expect(useRiderStore.getState().riderStatus).toBe('offline');

    // Offline -> Available
    await store.toggleOnlineStatus();
    expect(useRiderStore.getState().riderStatus).toBe('available');

    // If rider is busy on a trip, toggleOnlineStatus is locked
    useRiderStore.setState({ riderStatus: 'busy' });
    await store.toggleOnlineStatus();
    expect(useRiderStore.getState().riderStatus).toBe('busy');
  });

  it('handles incoming job offer and ticks down the 30-second timer', () => {
    const store = useRiderStore.getState();

    store.receiveJobOffer(sampleOffer);

    let state = useRiderStore.getState();
    expect(state.incomingOffer).not.toBeNull();
    expect(state.incomingOffer?.trackingCode).toBe('LGS-TEST-881');
    expect(state.offerSecondsLeft).toBe(30);

    // Tick down 5 seconds
    for (let i = 0; i < 5; i++) {
      useRiderStore.getState().tickOfferTimer();
    }

    state = useRiderStore.getState();
    expect(state.offerSecondsLeft).toBe(25);
    expect(state.incomingOffer).not.toBeNull();
  });

  it('auto-declines and dismisses the job offer when the 30-second countdown reaches zero', () => {
    const store = useRiderStore.getState();
    store.receiveJobOffer(sampleOffer);

    // Set countdown to 1 second remaining
    useRiderStore.setState({ offerSecondsLeft: 1 });

    // Next tick triggers timeout auto-decline
    useRiderStore.getState().tickOfferTimer();

    const state = useRiderStore.getState();
    expect(state.incomingOffer).toBeNull();
    expect(state.offerSecondsLeft).toBe(0);
  });

  it('declines a job offer manually without altering idle trip phase', async () => {
    const store = useRiderStore.getState();
    store.receiveJobOffer(sampleOffer);

    await store.declineOffer('test-order-001');

    const state = useRiderStore.getState();
    expect(state.incomingOffer).toBeNull();
    expect(state.offerSecondsLeft).toBe(0);
    expect(state.tripPhase).toBe('idle');
    expect(state.riderStatus).toBe('available');
  });

  it('accepts job offer, transitions riderStatus to busy and tripPhase to arriving_pickup with sanitized active order', async () => {
    const store = useRiderStore.getState();
    store.receiveJobOffer(sampleOffer);

    const success = await store.acceptOffer('test-order-001');
    expect(success).toBe(true);

    const state = useRiderStore.getState();
    expect(state.riderStatus).toBe('busy');
    expect(state.tripPhase).toBe('arriving_pickup');
    expect(state.incomingOffer).toBeNull();
    expect(state.activeOrder).not.toBeNull();
    expect(state.activeOrder?.trackingCode).toBe('LGS-TEST-881');
    expect(state.activeOrder?.riderEarningKobo).toBe(180000);
    expect(state.isSubmitting).toBe(false);
  });

  it('prevents double-tap race conditions when isSubmitting is true', async () => {
    useRiderStore.setState({ isSubmitting: true });
    const store = useRiderStore.getState();

    const result = await store.acceptOffer('test-order-001');
    expect(result).toBe(false);
  });

  it('progresses strictly through sequential trip phases: arriving_pickup -> at_pickup -> in_transit -> at_dropoff -> idle', async () => {
    const store = useRiderStore.getState();
    store.receiveJobOffer(sampleOffer);
    await store.acceptOffer('test-order-001');

    // Initial accepted phase: arriving_pickup
    expect(useRiderStore.getState().tripPhase).toBe('arriving_pickup');

    // Step 1: Arrived at pickup
    const step1 = await store.advanceTripPhase();
    expect(step1).toBe(true);
    expect(useRiderStore.getState().tripPhase).toBe('at_pickup');

    // Step 2: Collected package -> In transit
    const step2 = await store.advanceTripPhase();
    expect(step2).toBe(true);
    expect(useRiderStore.getState().tripPhase).toBe('in_transit');

    // Step 3: Arrived at dropoff
    const step3 = await store.advanceTripPhase();
    expect(step3).toBe(true);
    expect(useRiderStore.getState().tripPhase).toBe('at_dropoff');

    // Step 4: Completed dropoff -> returns to idle and credits earnings
    const step4 = await store.advanceTripPhase();
    expect(step4).toBe(true);

    const finalState = useRiderStore.getState();
    expect(finalState.tripPhase).toBe('idle');
    expect(finalState.riderStatus).toBe('available');
    expect(finalState.activeOrder).toBeNull();
    // ₦10,000 baseline (1,000,000 kobo) + ₦1,800 earned (180,000 kobo) = 1,180,000 kobo
    expect(finalState.todayEarningsKobo).toBe(1180000);
  });
});
