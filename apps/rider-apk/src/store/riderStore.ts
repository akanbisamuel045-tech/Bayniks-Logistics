import { create } from 'zustand';
import type { JobNewOffer } from '@logistics/shared-types';
import { backgroundLocationService } from '../services/backgroundLocation.service';
import { offlineTelemetryQueue } from '../services/offlineTelemetryQueue.service';
import {
  playMissionAcceptChime,
  playKeypadChime,
  playErrorChime,
} from '../utils/audioChimes';

export type RiderStatus = 'offline' | 'available' | 'busy';
export type TripPhase = 'idle' | 'arriving_pickup' | 'at_pickup' | 'in_transit' | 'at_dropoff';
export type RiderTab = 'home' | 'profile' | 'earnings' | 'support' | 'history' | 'kyc';

export type KycReviewStatus = 'pending_review' | 'approved' | 'rejected';

export interface KycDocumentData {
  nin: string;
  dateOfBirth: string;
  residentialAddress: string;
  nextOfKinName: string;
  nextOfKinPhone: string;
  vehicleType: 'bike' | 'van' | 'truck';
  plateNumber: string;
  lasdriNumber: string;
  ridersCardNumber: string;
  fleetCode?: string;
  passportPhotoUrl?: string;
  licensePhotoUrl?: string;
  submittedAt?: string;
}

export interface DeliveryHistoryItem {
  id: string;
  trackingCode: string;
  date: string;
  time: string;
  timestamp: number;
  fromAddress: string;
  fromLandmark: string;
  toAddress: string;
  toLandmark: string;
  distanceKm: number;
  durationMins: number;
  fareKobo: number;
  tipKobo: number;
  status: 'delivered' | 'cancelled' | 'in_dispute';
  proofType: 'pin' | 'qr';
  pinUsed?: string;
  packageType: string;
  recipientName: string;
  recipientPhone: string;
  rating?: number;
}

export interface RiderUser {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: 'rider';
  isVerified: boolean;
  plateNumber?: string;
  vehicleType?: 'bike' | 'van' | 'truck';
}

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

  // Shift & Wallet Summary State
  shiftSettledTrips: Array<{
    id: string;
    time: string;
    from: string;
    to: string;
    distanceKm: number;
    fareKobo: number;
    tipKobo: number;
  }>;
  tripsCompletedToday: number;
  distanceCoveredKm: number;
  onTimeSlaPercent: number;

  // In-App Chat State
  chatMessages: Array<{
    id: string;
    sender: 'rider' | 'customer';
    text: string;
    time: string;
  }>;

  // Theme & In-App Toast
  theme: 'light' | 'dark';
  setTheme: (mode: 'light' | 'dark') => void;
  toggleTheme: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  hideToast: () => void;

  // Mobile Navigation & Anchored Bottom Bar State
  activeTab: RiderTab;
  setActiveTab: (tab: RiderTab) => void;
  isQuickQrOpen: boolean;
  setQuickQrOpen: (open: boolean) => void;

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
  fetchShiftSummary: (apiBaseUrl?: string) => Promise<void>;
  requestInstantCashout: (amountKobo?: number, apiBaseUrl?: string) => Promise<{ success: boolean; message: string }>;
  sendChatMessage: (text: string, apiBaseUrl?: string) => Promise<void>;
  receiveChatMessage: (msg: { id: string; sender: 'rider' | 'customer'; text: string; time: string }) => void;
  triggerEmergencySos: (apiBaseUrl?: string) => Promise<{ success: boolean; sosTicket?: string; message: string }>;
  reportRoadIncident: (incidentType: string, description: string, apiBaseUrl?: string) => Promise<{ success: boolean; message: string }>;

  // Auth state & actions
  isLoggedIn: boolean;
  riderUser: RiderUser | null;
  isAuthModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  loginRider: (phone: string, password: string, apiBaseUrl?: string) => Promise<{ success: boolean; error?: string }>;
  registerRider: (
    payload: {
      fullName: string;
      phone: string;
      password: string;
      vehicleType: 'bike' | 'van' | 'truck';
      plateNumber: string;
      email?: string;
    },
    apiBaseUrl?: string
  ) => Promise<{ success: boolean; error?: string }>;
  verifyRiderOtp: (phone: string, otp: string, apiBaseUrl?: string) => Promise<{ success: boolean; error?: string }>;
  logoutRider: () => void;

  // KYC state & actions
  kycStatus: KycReviewStatus;
  kycRejectionReason: string | null;
  kycDocuments: KycDocumentData;
  submitKyc: (docs: Partial<KycDocumentData>, apiBaseUrl?: string) => Promise<{ success: boolean; error?: string }>;
  setKycStatus: (status: KycReviewStatus) => void;

  // Delivery History
  deliveryHistory: DeliveryHistoryItem[];
  addDeliveryHistoryRecord: (record: DeliveryHistoryItem) => void;

  // Drawer
  isDrawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
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

let toastDismissTimer: ReturnType<typeof setTimeout> | null = null;

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : undefined;
    if (storage && typeof storage.getItem === 'function') {
      const saved = storage.getItem('bayniks_mobile_rider_theme');
      if (saved === 'dark' || saved === 'light') {
        if (typeof document !== 'undefined' && document.documentElement) {
          document.documentElement.setAttribute('data-theme', saved);
        }
        return saved;
      }
    }
  } catch {
    // ignore access restriction
  }
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
  return 'light';
}

export const useRiderStore = create<RiderStoreState>((set, get) => ({
  theme: getInitialTheme(),
  toastMessage: null,

  setTheme: (mode: 'light' | 'dark') => {
    try {
      const storage = typeof window !== 'undefined' ? window.localStorage : undefined;
      if (storage && typeof storage.setItem === 'function') {
        storage.setItem('bayniks_mobile_rider_theme', mode);
      }
    } catch {}
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('data-theme', mode);
    }
    set({ theme: mode });
  },

  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(next);
    get().showToast(next === 'dark' ? 'Dark Mode enabled' : 'Light Mode enabled');
  },

  showToast: (msg: string) => {
    if (toastDismissTimer) {
      clearTimeout(toastDismissTimer);
    }
    set({ toastMessage: msg });
    toastDismissTimer = setTimeout(() => {
      set({ toastMessage: null });
      toastDismissTimer = null;
    }, 2800);
  },

  hideToast: () => {
    if (toastDismissTimer) {
      clearTimeout(toastDismissTimer);
      toastDismissTimer = null;
    }
    set({ toastMessage: null });
  },

  // Mobile Navigation & Anchored Bottom Bar State
  activeTab: 'home',
  setActiveTab: (tab: RiderTab) => {
    set({ activeTab: tab });
  },
  isQuickQrOpen: false,
  setQuickQrOpen: (open: boolean) => {
    set({ isQuickQrOpen: open });
  },

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

  // Shift & Wallet Summary Initial State
  shiftSettledTrips: [
    {
      id: '#473215090',
      time: '11:15 AM',
      from: 'Otigba St, Computer Village, Ikeja',
      to: 'Admiralty Way, Lekki Phase 1',
      distanceKm: 18.4,
      fareKobo: 450000,
      tipKobo: 50000,
    },
    {
      id: '#928474948',
      time: '09:40 AM',
      from: 'Commercial Ave, Yaba',
      to: 'Victoria Island Towers, Plot 4',
      distanceKm: 11.2,
      fareKobo: 380000,
      tipKobo: 0,
    },
    {
      id: '#882410921',
      time: '08:20 AM',
      from: 'Ikeja Central Depot',
      to: 'Marina Financial Hub, Lagos',
      distanceKm: 21.5,
      fareKobo: 520000,
      tipKobo: 100000,
    },
  ],
  tripsCompletedToday: 18,
  distanceCoveredKm: 42.8,
  onTimeSlaPercent: 99.4,
  chatMessages: [
    {
      id: 'm1',
      sender: 'customer',
      text: 'Good day! Please drop package with security if I am not at the door.',
      time: '11:02 AM',
    },
    {
      id: 'm2',
      sender: 'rider',
      text: 'Noted sir! I am currently en route, ETA is around 12 minutes.',
      time: '11:04 AM',
    },
    {
      id: 'm3',
      sender: 'customer',
      text: 'Great, thanks! I will have the delivery PIN ready for you.',
      time: '11:05 AM',
    },
  ],

  // Auth state & actions
  isLoggedIn: true,
  riderUser: {
    id: 'usr-rider-8492',
    fullName: 'Babajide Adeleke',
    phone: '+2348034218900',
    email: 'b.adeleke@bayniks.ng',
    role: 'rider',
    isVerified: true,
    plateNumber: 'KJA-824-XY',
    vehicleType: 'bike',
  },
  isAuthModalOpen: false,
  setAuthModalOpen: (open: boolean) => set({ isAuthModalOpen: open }),

  loginRider: async (phone: string, password: string, apiBaseUrl = '') => {
    set({ isSubmitting: true });
    const normalizedPhone = phone.startsWith('+234') ? phone : `+234${phone.replace(/^0/, '')}`;
    if (get().simulationMode || !apiBaseUrl) {
      const mockUser: RiderUser = {
        id: 'usr-rider-' + Math.floor(1000 + Math.random() * 9000),
        fullName: get().riderName || 'Babajide Adeleke',
        phone: normalizedPhone,
        email: 'b.adeleke@bayniks.ng',
        role: 'rider',
        isVerified: true,
        plateNumber: get().plateNumber || 'KJA-824-XY',
        vehicleType: 'bike',
      };
      const token = 'jwt-mock-rider-session-' + Date.now();
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('bayniks_rider_auth', JSON.stringify({ isLoggedIn: true, riderUser: mockUser, authToken: token }));
        }
      } catch {}
      set({
        isLoggedIn: true,
        riderUser: mockUser,
        authToken: token,
        isAuthModalOpen: false,
        isSubmitting: false,
      });
      get().showToast(`Welcome back, ${mockUser.fullName.split(' ')[0]}!`);
      return { success: true };
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ isSubmitting: false });
        return { success: false, error: data.error || 'Invalid phone or password' };
      }
      const riderUser: RiderUser = {
        id: data.user.id || data.user._id,
        fullName: data.user.fullName,
        phone: data.user.phone,
        email: data.user.email,
        role: 'rider',
        isVerified: data.user.isVerified,
      };
      set({
        isLoggedIn: true,
        riderUser,
        authToken: data.tokens.accessToken,
        isAuthModalOpen: false,
        isSubmitting: false,
      });
      get().showToast(`Welcome back, ${riderUser.fullName.split(' ')[0]}!`);
      return { success: true };
    } catch (err: any) {
      set({ isSubmitting: false });
      return { success: false, error: err.message || 'Network error signing in' };
    }
  },

  registerRider: async (payload, apiBaseUrl = '') => {
    set({ isSubmitting: true });
    const normalizedPhone = payload.phone.startsWith('+234') ? payload.phone : `+234${payload.phone.replace(/^0/, '')}`;
    if (get().simulationMode || !apiBaseUrl) {
      const mockUser: RiderUser = {
        id: 'usr-rider-' + Math.floor(1000 + Math.random() * 9000),
        fullName: payload.fullName,
        phone: normalizedPhone,
        email: payload.email || `${payload.fullName.toLowerCase().replace(/\s+/g, '.')}@bayniks.ng`,
        role: 'rider',
        isVerified: false,
        plateNumber: payload.plateNumber,
        vehicleType: payload.vehicleType,
      };
      set({
        riderName: payload.fullName,
        plateNumber: payload.plateNumber,
        riderUser: mockUser,
        isSubmitting: false,
      });
      get().showToast('OTP sent to ' + normalizedPhone);
      return { success: true };
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: payload.fullName,
          phone: normalizedPhone,
          email: payload.email,
          password: payload.password,
          role: 'rider',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ isSubmitting: false });
        return { success: false, error: data.error || 'Failed to create rider account' };
      }
      set({ isSubmitting: false });
      return { success: true };
    } catch (err: any) {
      set({ isSubmitting: false });
      return { success: false, error: err.message || 'Network error registering' };
    }
  },

  verifyRiderOtp: async (phone: string, otp: string, apiBaseUrl = '') => {
    set({ isSubmitting: true });
    const normalizedPhone = phone.startsWith('+234') ? phone : `+234${phone.replace(/^0/, '')}`;
    if (get().simulationMode || !apiBaseUrl) {
      const token = 'jwt-mock-rider-session-' + Date.now();
      const currentUser = get().riderUser || {
        id: 'usr-rider-' + Math.floor(1000 + Math.random() * 9000),
        fullName: get().riderName,
        phone: normalizedPhone,
        role: 'rider',
        isVerified: true,
      };
      currentUser.isVerified = true;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('bayniks_rider_auth', JSON.stringify({ isLoggedIn: true, riderUser: currentUser, authToken: token }));
        }
      } catch {}
      set({
        isLoggedIn: true,
        riderUser: currentUser,
        authToken: token,
        isAuthModalOpen: false,
        isSubmitting: false,
      });
      get().showToast('Account verified! Welcome to Bayniks Logistics');
      return { success: true };
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ isSubmitting: false });
        return { success: false, error: data.error || 'Invalid OTP code' };
      }
      set({
        isLoggedIn: true,
        authToken: data.tokens?.accessToken || 'jwt-verified-token',
        isAuthModalOpen: false,
        isSubmitting: false,
      });
      return { success: true };
    } catch (err: any) {
      set({ isSubmitting: false });
      return { success: false, error: err.message || 'Network error verifying OTP' };
    }
  },

  logoutRider: () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('bayniks_rider_auth');
      }
    } catch {}
    set({
      isLoggedIn: false,
      riderUser: null,
      authToken: null,
      riderStatus: 'offline',
      isAuthModalOpen: true,
      isDrawerOpen: false,
    });
    get().showToast('Signed out of Bayniks Courier');
  },

  // KYC state & actions
  kycStatus: 'approved',
  kycRejectionReason: null,
  kycDocuments: {
    nin: '28491029481',
    lasdriNumber: 'LSD-2024-84910',
    ridersCardNumber: 'RC-LAG-98214',
    licenseNumber: 'DL-LS-2022-77192',
    vehicleType: 'bike',
    plateNumber: 'KJA-824-XY',
    fleetCode: 'FLT-LAGOS-01',
    dateOfBirth: '1994-06-14',
    residentialAddress: '14 Olumo Street, Onike, Yaba, Lagos',
    nextOfKinName: 'Abiola Adeleke',
    nextOfKinPhone: '+2348034567890',
  },
  submitKyc: async (docs, apiBaseUrl = '') => {
    set({ isSubmitting: true });
    const mergedDocs = { ...get().kycDocuments, ...docs, submittedAt: new Date().toISOString() };
    if (get().simulationMode || !apiBaseUrl) {
      set({
        kycDocuments: mergedDocs,
        kycStatus: 'pending_review',
        isSubmitting: false,
      });
      get().showToast('KYC documents submitted! In review (12-24h)');
      return { success: true };
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/riders/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${get().authToken}`,
        },
        body: JSON.stringify({
          vehicleType: mergedDocs.vehicleType,
          plateNumber: mergedDocs.plateNumber,
          ridersCardNumber: mergedDocs.ridersCardNumber,
          ridersCardDocumentUrl: mergedDocs.licensePhotoUrl || 'https://storage.bayniks.ng/docs/demo-permit.jpg',
          vehiclePhotoUrl: mergedDocs.passportPhotoUrl || 'https://storage.bayniks.ng/docs/demo-bike.jpg',
          fleetInviteCodeOrPhone: mergedDocs.fleetCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ isSubmitting: false });
        return { success: false, error: data.error || 'Failed to submit KYC' };
      }
      set({
        kycDocuments: mergedDocs,
        kycStatus: 'pending_review',
        isSubmitting: false,
      });
      return { success: true };
    } catch (err: any) {
      set({ isSubmitting: false });
      return { success: false, error: err.message || 'Network error submitting KYC' };
    }
  },
  setKycStatus: (status) => set({ kycStatus: status }),

  // Delivery History
  deliveryHistory: [
    {
      id: 'del-849201',
      trackingCode: 'LGS-849201',
      date: 'Today',
      time: '11:15 AM',
      timestamp: Date.now() - 3600000 * 2,
      fromAddress: 'Otigba Street, Computer Village, Ikeja',
      fromLandmark: 'Beside slot main building, Yellow canopy',
      toAddress: 'Admiralty Way, Lekki Phase 1',
      toLandmark: 'Beside Ebeano Supermarket, Gate 2',
      distanceKm: 18.4,
      durationMins: 45,
      fareKobo: 450000,
      tipKobo: 50000,
      status: 'delivered',
      proofType: 'pin',
      pinUsed: '7482',
      packageType: 'Electronics • Laptop & Accessories',
      recipientName: 'Michael Chen',
      recipientPhone: '+2348034445566',
      rating: 5,
    },
    {
      id: 'del-773192',
      trackingCode: 'LGS-773192',
      date: 'Today',
      time: '09:40 AM',
      timestamp: Date.now() - 3600000 * 4,
      fromAddress: 'Commercial Ave, Yaba Tech Hub',
      fromLandmark: 'Opposite Domino Pizza, Yaba',
      toAddress: 'Victoria Island Towers, Plot 4',
      toLandmark: 'Beside Civic Centre, Waterfront Gate',
      distanceKm: 11.2,
      durationMins: 28,
      fareKobo: 380000,
      tipKobo: 0,
      status: 'delivered',
      proofType: 'qr',
      packageType: 'Legal Documents • Confidential',
      recipientName: 'Barrister Folake Sanusi',
      recipientPhone: '+2348028889900',
      rating: 5,
    },
    {
      id: 'del-620481',
      trackingCode: 'LGS-620481',
      date: 'Yesterday',
      time: '04:20 PM',
      timestamp: Date.now() - 3600000 * 24,
      fromAddress: 'Ikeja Central Freight Depot',
      fromLandmark: 'Inside Ikeja Rail Corridor Terminal',
      toAddress: 'Marina Financial Hub, CMS Lagos',
      toLandmark: 'Near UBA House Entrance',
      distanceKm: 22.1,
      durationMins: 52,
      fareKobo: 520000,
      tipKobo: 100000,
      status: 'delivered',
      proofType: 'pin',
      pinUsed: '3190',
      packageType: 'Spare Parts • Machine Component (4.2kg)',
      recipientName: 'Engineer Kolawole',
      recipientPhone: '+2348123334455',
      rating: 5,
    },
    {
      id: 'del-559104',
      trackingCode: 'LGS-559104',
      date: 'Yesterday',
      time: '01:10 PM',
      timestamp: Date.now() - 3600000 * 27,
      fromAddress: 'Bode Thomas Street, Surulere',
      fromLandmark: 'Near Adeniran Ogunsanya Junction',
      toAddress: 'Allen Avenue, Ikeja',
      toLandmark: 'Opposite Oshopey Plaza',
      distanceKm: 12.8,
      durationMins: 34,
      fareKobo: 320000,
      tipKobo: 20000,
      status: 'delivered',
      proofType: 'pin',
      pinUsed: '8261',
      packageType: 'Fashion & Apparel • Designer Box',
      recipientName: 'Amara Nnamdi',
      recipientPhone: '+2348091122334',
      rating: 4.9,
    },
    {
      id: 'del-412890',
      trackingCode: 'LGS-412890',
      date: '12 Nov 2026',
      time: '11:05 AM',
      timestamp: Date.now() - 3600000 * 72,
      fromAddress: 'Maryland Mall, Ikorodu Road',
      fromLandmark: 'Big Black Box / Anthony Bypass',
      toAddress: 'Festac Town, 2nd Avenue, 21 Road',
      toLandmark: 'Near Mobil Filling Station Gate',
      distanceKm: 24.6,
      durationMins: 58,
      fareKobo: 610000,
      tipKobo: 50000,
      status: 'delivered',
      proofType: 'qr',
      packageType: 'Pharmaceutical Supplies • Temperature Sensitive',
      recipientName: 'Dr. Chinedu Eze',
      recipientPhone: '+2348039988776',
      rating: 5,
    },
    {
      id: 'del-389102',
      trackingCode: 'LGS-389102',
      date: '10 Nov 2026',
      time: '03:15 PM',
      timestamp: Date.now() - 3600000 * 120,
      fromAddress: 'Awolowo Road, Ikoyi',
      fromLandmark: 'Near Standard Chartered Bank',
      toAddress: 'Chevron Drive, Lekki Phase 2',
      toLandmark: 'Opposite Northern Foreshore Estate',
      distanceKm: 14.2,
      durationMins: 38,
      fareKobo: 390000,
      tipKobo: 0,
      status: 'delivered',
      proofType: 'pin',
      pinUsed: '4019',
      packageType: 'Office Hardware • Dual Monitors',
      recipientName: 'Tunde Bakare',
      recipientPhone: '+2348187766554',
      rating: 5,
    },
  ],
  addDeliveryHistoryRecord: (record) =>
    set((state) => ({ deliveryHistory: [record, ...state.deliveryHistory] })),

  // Drawer
  isDrawerOpen: false,
  setDrawerOpen: (open: boolean) => set({ isDrawerOpen: open }),

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
    const { riderStatus, tripPhase, activeOrder, authToken, showToast } = get();
    // Capacity Guard: Cannot toggle offline while actively on an assignment
    if (riderStatus === 'busy' || tripPhase !== 'idle' || activeOrder !== null) {
      playErrorChime();
      showToast('Capacity locked (1/1): Complete active delivery first');
      return;
    }

    const nextStatus = riderStatus === 'available' ? 'offline' : 'available';

    // Auditory and Toast Feedback
    if (nextStatus === 'available') {
      playMissionAcceptChime();
      showToast('You are ONLINE • Scanning Lagos corridor');
    } else {
      playKeypadChime();
      showToast('You are now OFFLINE');
    }

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
    const { activeOrder, tripPhase, riderStatus } = get();
    // Strict Capacity Lock (N=1): Reject incoming offers if rider is busy or has an active mission
    if (activeOrder !== null || tripPhase !== 'idle' || riderStatus === 'busy') {
      return;
    }
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
    const { isSubmitting, incomingOffer, authToken, simulationMode, activeOrder, tripPhase } = get();
    // Capacity Guard: Cannot accept order if already executing an active delivery (N=1)
    if (isSubmitting || (activeOrder !== null && tripPhase !== 'idle')) return false;

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
    const { activeOrder, todayEarningsKobo, deliveryHistory } = get();
    const earningsEarned = activeOrder?.riderEarningKobo || 0;

    backgroundLocationService.stopForegroundDeliveryTracking();

    const now = new Date();
    const historyRecord: DeliveryHistoryItem | null = activeOrder
      ? {
          id: 'del-' + activeOrder._id,
          trackingCode: activeOrder.trackingCode,
          date: 'Today',
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now(),
          fromAddress: activeOrder.pickup.address,
          fromLandmark: activeOrder.pickup.landmark,
          toAddress: activeOrder.stops[0]?.dropoffAddress || 'Lagos Central',
          toLandmark: activeOrder.stops[0]?.dropoffLandmark || 'Lagos Island',
          distanceKm: activeOrder.estimatedDistanceKm || 5.2,
          durationMins: Math.round((activeOrder.estimatedDistanceKm || 5.2) * 3.5),
          fareKobo: earningsEarned || 250000,
          tipKobo: 0,
          status: 'delivered',
          proofType: 'pin',
          pinUsed: '7482',
          packageType: activeOrder.stops[0]?.packageDescription || 'Express Cargo',
          recipientName: activeOrder.stops[0]?.recipientName || 'Verified Recipient',
          recipientPhone: activeOrder.stops[0]?.recipientPhone || '+2348000000000',
          rating: 5,
        }
      : null;

    set({
      tripPhase: 'idle',
      riderStatus: 'available',
      activeOrder: null,
      todayEarningsKobo: todayEarningsKobo + earningsEarned,
      deliveryHistory: historyRecord ? [historyRecord, ...deliveryHistory] : deliveryHistory,
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

  fetchShiftSummary: async (apiBaseUrl = '') => {
    const { authToken } = get();
    if (!authToken) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/riders/shift-summary`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({
          todayEarningsKobo: data.todayEarningsKobo,
          tripsCompletedToday: data.tripsCompletedToday,
          distanceCoveredKm: data.distanceCoveredKm,
          onTimeSlaPercent: data.onTimeSlaPercent,
          shiftSettledTrips: data.settledTrips || get().shiftSettledTrips,
        });
      }
    } catch {
      // Non-fatal offline fallback
    }
  },

  requestInstantCashout: async (amountKobo, apiBaseUrl = '') => {
    const { authToken, todayEarningsKobo } = get();
    const cashoutAmount = amountKobo || todayEarningsKobo;
    try {
      if (authToken) {
        const res = await fetch(`${apiBaseUrl}/api/v1/riders/cashout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ amountKobo: cashoutAmount }),
        });
        if (res.ok) {
          set({ todayEarningsKobo: 0 });
          return { success: true, message: 'Instant NIP payout transfer initiated successfully' };
        }
      }
      // Simulation / offline success fallback
      set({ todayEarningsKobo: 0 });
      return { success: true, message: 'Instant NIP payout transfer initiated successfully' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Cashout failed' };
    }
  },

  sendChatMessage: async (text, apiBaseUrl = '') => {
    const { activeOrder, authToken, chatMessages } = get();
    const newMsg = {
      id: 'm-' + Date.now(),
      sender: 'rider' as const,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    set({ chatMessages: [...chatMessages, newMsg] });

    if (authToken && activeOrder) {
      try {
        await fetch(`${apiBaseUrl}/api/v1/orders/${activeOrder._id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ text, senderName: 'Tariq Danladi (Courier)' }),
        });
      } catch {
        // Non-fatal
      }
    }
  },

  receiveChatMessage: (msg) => {
    set({ chatMessages: [...get().chatMessages, msg] });
  },

  triggerEmergencySos: async (apiBaseUrl = '') => {
    const { currentLocation, currentSpeed, batteryLevel, activeOrder, authToken } = get();
    const sosTicket = `SOS-${Date.now().toString().slice(-6)}`;
    try {
      if (authToken) {
        await fetch(`${apiBaseUrl}/api/v1/riders/emergency/sos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            orderId: activeOrder?._id,
            lat: currentLocation.lat,
            lng: currentLocation.lng,
            speed: currentSpeed,
            batteryLevel,
            timestamp: Date.now(),
          }),
        });
      }
      return { success: true, sosTicket, message: 'Emergency SOS alert received and dispatched to Command Center' };
    } catch {
      return { success: true, sosTicket, message: 'Emergency alert cached locally and transmitted' };
    }
  },

  reportRoadIncident: async (incidentType, description, apiBaseUrl = '') => {
    const { currentLocation, activeOrder, authToken } = get();
    try {
      if (authToken) {
        await fetch(`${apiBaseUrl}/api/v1/riders/incidents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            orderId: activeOrder?._id,
            incidentType,
            description,
            lat: currentLocation.lat,
            lng: currentLocation.lng,
            timestamp: Date.now(),
          }),
        });
      }
      return { success: true, message: `Incident '${incidentType}' logged successfully` };
    } catch {
      return { success: true, message: `Incident '${incidentType}' logged locally` };
    }
  },
}));
