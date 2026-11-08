import { create } from 'zustand';
import type { JobNewOffer } from '@logistics/shared-types';
import { backgroundLocationService } from '../services/backgroundLocation.service';
import { offlineTelemetryQueue } from '../services/offlineTelemetryQueue.service';

export type RiderStatus = 'offline' | 'available' | 'busy';
export type TripPhase = 'idle' | 'arriving_pickup' | 'at_pickup' | 'in_transit' | 'at_dropoff';

export interface ActiveOrderStop {
  sequenceNumber: number;
  recipientName: string;
  recipientPhone: string;
  dropoffAddress: string;
  dropoffLandmark: string;
  dropoffLocation: { lat: number; lng: number };
  packageDescription: string;
  status: string;
}

export interface ActiveOrderData {
  _id: string;
  trackingCode: string;
  status: string;
  vehicleType: string;
  paymentMethod: string;
  totalFareKobo: number;
  riderEarningKobo: number;
  estimatedDistanceKm: number;
  pickup: {
    address: string;
    landmark: string;
    location: { lat: number; lng: number };
    contactName: string;
    contactPhone: string;
  };
  stops: ActiveOrderStop[];
  encodedRoutePolyline?: string;
}

export interface RiderStoreState {
  // Rider Profile & Connectivity
  riderName: string;
  plateNumber: string;
  riderStatus: RiderStatus;
  authToken: string | null;

  // Real-time Telemetry
  currentLocation: { lat: number; lng: number };
  currentBearing: number;
  currentSpeed: number;
  currentAccuracy: number;
  batteryLevel: number;

  // Earnings
  todayEarningsKobo: number;

  // Active Job State Machine
  tripPhase: TripPhase;
  activeOrder: ActiveOrderData | null;
  incomingOffer: JobNewOffer | null;
  offerSecondsLeft: number;
  isSubmitting: boolean;

  // Simulation & Debugging Mode
  simulationMode: boolean;

  // Offline Sync & Network Telemetry
  pendingOfflinePingsCount: number;
  isNetworkConnected: boolean;

  // Actions
  setAuthToken: (token: string) => void;
  setRiderProfile: (name: string, plate: string) => void;
  setCurrentLocation: (coords: { lat: number; lng: number }, bearing?: number, speed?: number, accuracy?: number) => void;
  setPendingOfflinePingsCount: (count: number) => void;
  setNetworkConnected: (connected: boolean) => void;
  syncOfflinePings: (apiBaseUrl?: string) => Promise<{ flushedCount: number; remainingCount: number }>;
  toggleOnlineStatus: () => Promise<void>;
  receiveJobOffer: (offer: JobNewOffer) => void;
  tickOfferTimer: () => void;
  acceptOffer: (orderId: string, apiBaseUrl?: string) => Promise<boolean>;
  declineOffer: (orderId: string, apiBaseUrl?: string) => Promise<boolean>;
  advanceTripPhase: (apiBaseUrl?: string) => Promise<boolean>;
  verifyPickupPin: (pin: string, apiBaseUrl?: string) => Promise<{ success: boolean; error?: string }>;
  verifyDeliveryPin: (
    pin: string,
    photoDataUrl: string,
    byteSize: number,
    stopSequenceNumber?: number,
    apiBaseUrl?: string
  ) => Promise<{ success: boolean; error?: string }>;
  completeCurrentTrip: () => void;
  setSimulationMode: (enabled: boolean) => void;
  triggerDemoOffer: () => void;
}

/**
 * Loud motorcycle helmet audio chime synthesized via Web Audio API.
 * Uses a double frequency chirp (1000Hz -> 1800Hz) audible through engine rumble.
 */
export function playDispatchChime(): void {
  try {
    if (typeof window === 'undefined' || !(window.AudioContext || (window as any).webkitAudioContext)) {
      return;
    }
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.2);
    osc.frequency.exponentialRampToValueAtTime(2200, ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Audio context may be restricted before first user interaction
  }
}

export const useRiderStore = create<RiderStoreState>((set, get) => ({
  riderName: 'Babajide Adeleke',
  plateNumber: 'KJA-824-XY',
  riderStatus: 'available',
  authToken: null,

  // Default coordinate: Computer Village, Ikeja (6.5933, 3.3421)
  currentLocation: { lat: 6.5933, lng: 3.3421 },
  currentBearing: 45,
  currentSpeed: 32.5,
  currentAccuracy: 3.2,
  batteryLevel: 88,

  todayEarningsKobo: 1850000, // ₦18,500.00
  tripPhase: 'idle',
  activeOrder: null,
  incomingOffer: null,
  offerSecondsLeft: 30,
  isSubmitting: false,
  simulationMode: true,
  pendingOfflinePingsCount: 0,
  isNetworkConnected: typeof navigator !== 'undefined' ? navigator.onLine : true,

  setAuthToken: (token: string) => set({ authToken: token }),

  setRiderProfile: (name: string, plate: string) => set({ riderName: name, plateNumber: plate }),

  setCurrentLocation: (coords, bearing = 0, speed = 0, accuracy = 3.5) =>
    set({
      currentLocation: coords,
      currentBearing: bearing,
      currentSpeed: speed,
      currentAccuracy: accuracy,
    }),

  setPendingOfflinePingsCount: (count: number) => set({ pendingOfflinePingsCount: count }),

  setNetworkConnected: (connected: boolean) => set({ isNetworkConnected: connected }),

  syncOfflinePings: async (apiBaseUrl = '') => {
    const { authToken } = get();
    const result = await offlineTelemetryQueue.flushOfflineQueue(apiBaseUrl, authToken || '');
    set({ pendingOfflinePingsCount: result.remainingCount });
    return result;
  },

  toggleOnlineStatus: async () => {
    const { riderStatus, authToken } = get();
    if (riderStatus === 'busy') return; // Cannot toggle while actively on a job

    const nextStatus = riderStatus === 'available' ? 'offline' : 'available';

    // If online token is present and not purely simulating, update status on backend
    if (authToken && !get().simulationMode) {
      try {
        await fetch('/api/v1/riders/status', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            status: nextStatus,
            lat: get().currentLocation.lat,
            lng: get().currentLocation.lng,
          }),
        });
      } catch {
        // Fallback to local state toggle
      }
    }

    if (nextStatus === 'offline') {
      backgroundLocationService.stopForegroundDeliveryTracking();
    }

    set({ riderStatus: nextStatus });
  },

  receiveJobOffer: (offer: JobNewOffer) => {
    set({
      incomingOffer: offer,
      offerSecondsLeft: 30,
    });
    playDispatchChime();
  },

  tickOfferTimer: () => {
    const { offerSecondsLeft, incomingOffer, declineOffer } = get();
    if (!incomingOffer) return;

    if (offerSecondsLeft <= 1) {
      declineOffer(incomingOffer.orderId);
    } else {
      set({ offerSecondsLeft: offerSecondsLeft - 1 });
    }
  },

  acceptOffer: async (orderId: string, apiBaseUrl = '') => {
    const { isSubmitting, incomingOffer, authToken, simulationMode } = get();
    if (isSubmitting) return false;

    set({ isSubmitting: true });

    try {
      if (authToken && !simulationMode) {
        const res = await fetch(`${apiBaseUrl}/api/v1/dispatch/respond`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ orderId, action: 'accept' }),
        });

        if (!res.ok) {
          set({ isSubmitting: false });
          return false;
        }

        const data = await res.json();
        set({
          riderStatus: 'busy',
          tripPhase: 'arriving_pickup',
          incomingOffer: null,
          offerSecondsLeft: 0,
          activeOrder: data.order,
          isSubmitting: false,
        });

        // Launch background geolocation foreground service
        backgroundLocationService.startForegroundDeliveryTracking({
          orderId,
          trackingCode: data.order.trackingCode,
          authToken,
          onLocation: (ping) => {
            get().setCurrentLocation(
              { lat: ping.lat, lng: ping.lng },
              ping.bearing,
              ping.speed,
              ping.accuracy
            );
          },
        });
        return true;
      }

      // Simulation mode fallback
      const simulatedActiveOrder: ActiveOrderData = {
        _id: orderId,
        trackingCode: incomingOffer?.trackingCode || 'LGS-SIM-099',
        status: 'rider_assigned',
        vehicleType: 'bike',
        paymentMethod: 'wallet',
        totalFareKobo: incomingOffer?.riderEarningKobo ? incomingOffer.riderEarningKobo + 50000 : 250000,
        riderEarningKobo: incomingOffer?.riderEarningKobo || 200000,
        estimatedDistanceKm: incomingOffer?.estimatedDistanceKm || 4.2,
        pickup: {
          address: incomingOffer?.pickupAddress || 'Computer Village, Awolowo Way, Ikeja',
          landmark: incomingOffer?.pickupLandmark || 'Beside BRT Under Bridge',
          location: { lat: 6.5933, lng: 3.3421 },
          contactName: 'Emeka Okafor (Sender)',
          contactPhone: '+2348021112233',
        },
        stops: [
          {
            sequenceNumber: 1,
            recipientName: 'Bisi Adebayo (Recipient)',
            recipientPhone: '+2348034445566',
            dropoffAddress: '15 Isaac John St, Ikeja GRA',
            dropoffLandmark: 'Opposite Radisson Blu, Black Gate',
            dropoffLocation: { lat: 6.5862, lng: 3.3582 },
            packageDescription: 'Phone screen replacement kit',
            status: 'pending',
          },
        ],
      };

      set({
        riderStatus: 'busy',
        tripPhase: 'arriving_pickup',
        incomingOffer: null,
        offerSecondsLeft: 0,
        activeOrder: simulatedActiveOrder,
        isSubmitting: false,
      });

      // Launch background geolocation foreground service
      backgroundLocationService.startForegroundDeliveryTracking({
        orderId,
        trackingCode: simulatedActiveOrder.trackingCode,
        authToken,
        onLocation: (ping) => {
          get().setCurrentLocation(
            { lat: ping.lat, lng: ping.lng },
            ping.bearing,
            ping.speed,
            ping.accuracy
          );
        },
      });
      return true;
    } catch {
      set({ isSubmitting: false });
      return false;
    }
  },

  declineOffer: async (orderId: string, apiBaseUrl = '') => {
    const { authToken, simulationMode } = get();

    if (authToken && !simulationMode) {
      try {
        await fetch(`${apiBaseUrl}/api/v1/dispatch/respond`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ orderId, action: 'decline' }),
        });
      } catch {
        // Ignore network errors on decline
      }
    }

    set({
      incomingOffer: null,
      offerSecondsLeft: 0,
    });
    return true;
  },

  advanceTripPhase: async (apiBaseUrl = '') => {
    const { tripPhase, activeOrder, isSubmitting, authToken, simulationMode, completeCurrentTrip } = get();
    if (isSubmitting || !activeOrder) return false;

    set({ isSubmitting: true });

    let nextTargetStatus: 'arrived_pickup' | 'in_transit' | 'arrived_dropoff' | null = null;
    let nextPhase: TripPhase = tripPhase;

    if (tripPhase === 'arriving_pickup') {
      nextTargetStatus = 'arrived_pickup';
      nextPhase = 'at_pickup';
    } else if (tripPhase === 'at_pickup') {
      nextTargetStatus = 'in_transit';
      nextPhase = 'in_transit';
    } else if (tripPhase === 'in_transit') {
      nextTargetStatus = 'arrived_dropoff';
      nextPhase = 'at_dropoff';
    } else if (tripPhase === 'at_dropoff') {
      // Completed dropoff handover (Stage 15 will implement PIN verification)
      completeCurrentTrip();
      set({ isSubmitting: false });
      return true;
    }

    try {
      if (nextTargetStatus && authToken && !simulationMode) {
        const res = await fetch(`${apiBaseUrl}/api/v1/dispatch/orders/${activeOrder._id}/state`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            status: nextTargetStatus,
            stopSequenceNumber: 1,
          }),
        });

        if (!res.ok) {
          set({ isSubmitting: false });
          return false;
        }

        const data = await res.json();
        set({
          activeOrder: data.order,
          tripPhase: nextPhase,
          isSubmitting: false,
        });
        return true;
      }

      // Local / Simulation state advance
      set((state) => ({
        tripPhase: nextPhase,
        activeOrder: state.activeOrder
          ? {
              ...state.activeOrder,
              status: nextTargetStatus || state.activeOrder.status,
            }
          : null,
        isSubmitting: false,
      }));
      return true;
    } catch {
      set({ isSubmitting: false });
      return false;
    }
  },

  verifyPickupPin: async (pin: string, apiBaseUrl = '') => {
    const { activeOrder, authToken, simulationMode } = get();
    if (!activeOrder) return { success: false, error: 'No active order' };

    set({ isSubmitting: true });

    if (simulationMode || !authToken) {
      set((state) => ({
        tripPhase: 'in_transit',
        activeOrder: state.activeOrder ? { ...state.activeOrder, status: 'in_transit' } : null,
        isSubmitting: false,
      }));
      return { success: true };
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/dispatch/orders/${activeOrder._id}/verify-pickup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ orderId: activeOrder._id, pickupPin: pin }),
      });

      const data = await res.json();
      if (!res.ok) {
        set({ isSubmitting: false });
        return { success: false, error: data.error || 'Failed to verify pickup PIN' };
      }

      set({
        tripPhase: 'in_transit',
        activeOrder: data.order,
        isSubmitting: false,
      });
      return { success: true };
    } catch (err: any) {
      set({ isSubmitting: false });
      return { success: false, error: err.message || 'Network error verifying pickup PIN' };
    }
  },

  verifyDeliveryPin: async (
    pin: string,
    photoDataUrl: string,
    byteSize: number,
    stopSequenceNumber = 1,
    apiBaseUrl = ''
  ) => {
    const { activeOrder, authToken, simulationMode, completeCurrentTrip } = get();
    if (!activeOrder) return { success: false, error: 'No active order' };

    set({ isSubmitting: true });

    if (simulationMode || !authToken) {
      completeCurrentTrip();
      set({ isSubmitting: false });
      return { success: true };
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/dispatch/orders/${activeOrder._id}/verify-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          orderId: activeOrder._id,
          stopSequenceNumber,
          deliveryPin: pin,
          proofOfDeliveryBase64OrUrl: photoDataUrl,
          byteSize,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        set({ isSubmitting: false });
        return { success: false, error: data.error || 'Failed to verify delivery PIN' };
      }

      // If order status is delivered, trip is complete
      if (data.order?.status === 'delivered') {
        completeCurrentTrip();
      } else {
        set({ activeOrder: data.order });
      }

      set({ isSubmitting: false });
      return { success: true };
    } catch (err: any) {
      set({ isSubmitting: false });
      return { success: false, error: err.message || 'Network error verifying delivery PIN' };
    }
  },

  completeCurrentTrip: () => {
    const { activeOrder, todayEarningsKobo } = get();
    const earningsEarned = activeOrder?.riderEarningKobo || 0;

    backgroundLocationService.stopForegroundDeliveryTracking();

    set({
      tripPhase: 'idle',
      riderStatus: 'available',
      activeOrder: null,
      todayEarningsKobo: todayEarningsKobo + earningsEarned,
    });
  },

  setSimulationMode: (enabled: boolean) => set({ simulationMode: enabled }),

  triggerDemoOffer: () => {
    const mockOffer: JobNewOffer = {
      orderId: 'mock-order-' + Date.now().toString().slice(-4),
      trackingCode: 'LGS-DEMO-' + Math.floor(100 + Math.random() * 900),
      pickupAddress: 'Computer Village, Otigba St, Ikeja',
      pickupLandmark: 'Beside slot main building, Yellow canopy',
      estimatedDistanceKm: 4.8,
      riderEarningKobo: 240000, // ₦2,400.00
      stopsCount: 1,
      expiresAt: Date.now() + 30000,
    };

    get().receiveJobOffer(mockOffer);
  },
}));
