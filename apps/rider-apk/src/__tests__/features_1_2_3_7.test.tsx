// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useRiderStore } from '../store/riderStore';
import { calculateDistanceMeters, checkArrivalProximity } from '../utils/geofenceProximity';
import {
  openGoogleMapsNavigation,
  openWazeNavigation,
  buildGoogleMapsUrl,
  buildWazeUrl,
} from '../utils/navigationDeepLink';
import {
  cleanNigerianPhoneForWhatsApp,
  buildWhatsAppUrl,
  WHATSAPP_TEMPLATES,
  ContactPartyInfo,
} from '../utils/whatsappTemplates';
import { batteryOptimizationService } from '../services/batteryOptimization.service';
import { detectMockLocation } from '../utils/mockLocationDetector';
import { NavigationChooserModal } from '../components/sheets/NavigationChooserModal';
import { ProximityArrivalBanner } from '../components/ProximityArrivalBanner';
import { RiderContactModal } from '../components/sheets/RiderContactModal';
import { CashCollectionModal } from '../components/sheets/CashCollectionModal';
import { VirtualDebtMeter } from '../components/VirtualDebtMeter';
import { VirtualDebtTopUpModal } from '../components/sheets/VirtualDebtTopUpModal';
import { MockLocationWarningModal } from '../components/MockLocationWarningModal';

describe('Features 1, 2, 3 & 7 Comprehensive Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRiderStore.setState({
      riderStatus: 'available',
      tripPhase: 'idle',
      activeOrder: null,
      incomingOffer: null,
      walletBalanceKobo: 0,
      isDebtLocked: false,
      isProximityArrivalPromptOpen: false,
      proximityTargetName: '',
      proximityDistanceMeters: 0,
      isMockLocationDetected: false,
      mockLocationReason: null,
    });
  });

  // ==========================================================================
  // FEATURE 1: External Navigation & Proximity Auto-Arrival
  // ==========================================================================
  describe('Feature 1: Navigation & Geofence Proximity Auto-Arrival (≤ 120m)', () => {
    it('calculates Haversine distance correctly and detects arrival within 120 meters', () => {
      // Yaba coordinates
      const locA = { lat: 6.5158, lng: 3.3718 };
      // ~45 meters away
      const locNear = { lat: 6.5161, lng: 3.3721 };
      // ~1.5 km away (Surulere)
      const locFar = { lat: 6.5000, lng: 3.3600 };

      const distNear = calculateDistanceMeters(locA.lat, locA.lng, locNear.lat, locNear.lng);
      expect(distNear).toBeLessThan(120);

      const distFar = calculateDistanceMeters(locA.lat, locA.lng, locFar.lat, locFar.lng);
      expect(distFar).toBeGreaterThan(120);

      const checkNear = checkArrivalProximity(locA, locNear, 120);
      expect(checkNear.isWithinProximity).toBe(true);

      const checkFar = checkArrivalProximity(locA, locFar, 120);
      expect(checkFar.isWithinProximity).toBe(false);
    });

    it('generates two-wheeler Google Maps deep links and Waze navigation URLs', () => {
      const gmapsUrl = buildGoogleMapsUrl(6.5158, 3.3718, '14 Commercial Ave, Yaba');
      expect(gmapsUrl).toContain('6.5158');
      expect(gmapsUrl).toContain('3.3718');
      expect(gmapsUrl).toContain('two-wheeler');

      const wazeUrl = buildWazeUrl(6.5158, 3.3718);
      expect(wazeUrl).toContain('6.5158');
      expect(wazeUrl).toContain('3.3718');
      expect(wazeUrl).toContain('navigate=yes');
    });

    it('renders NavigationChooserModal and triggers navigation app hand-off', () => {
      const onCloseMock = vi.fn();
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      render(
        <NavigationChooserModal
          isOpen={true}
          onClose={onCloseMock}
          target={{ lat: 6.5158, lng: 3.3718, address: 'Yaba Depot' }}
          targetType="pickup"
        />
      );

      expect(screen.getByTestId('navigation-chooser-modal')).toBeDefined();
      expect(screen.getByText('Google Maps')).toBeDefined();
      expect(screen.getByText('Two-Wheeler Mode')).toBeDefined();
      expect(screen.getByText('Waze Navigation')).toBeDefined();

      const gmapsBtn = screen.getByTestId('btn-nav-google-maps');
      fireEvent.click(gmapsBtn);
      expect(onCloseMock).toHaveBeenCalled();

      openSpy.mockRestore();
    });

    it('renders ProximityArrivalBanner and advances trip on "I\'m Here" confirmation', () => {
      const onConfirmMock = vi.fn();

      render(
        <ProximityArrivalBanner
          isOpen={true}
          targetName="Victoria Island Towers, Plot 4"
          distanceFormatted="75m"
          onConfirmArrival={onConfirmMock}
        />
      );

      expect(screen.getByTestId('proximity-arrival-banner')).toBeDefined();
      expect(screen.getByText(/Within 75m of Destination/i)).toBeDefined();

      const confirmBtn = screen.getByTestId('btn-proximity-confirm-arrival');
      fireEvent.click(confirmBtn);
      expect(onConfirmMock).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // FEATURE 2: Cash-on-Delivery (COD) & Virtual Debt Clearance
  // ==========================================================================
  describe('Feature 2: Cash-on-Delivery Ledger & Virtual Debt Circuit Breaker', () => {
    it('calculates change accurately and validates cash tendered in CashCollectionModal', () => {
      const onConfirmMock = vi.fn();
      const onCloseMock = vi.fn();

      render(
        <CashCollectionModal
          isOpen={true}
          onClose={onCloseMock}
          fareKobo={350000} // ₦3,500
          trackingCode="#LGS-892"
          onConfirmCollection={onConfirmMock}
        />
      );

      expect(screen.getByTestId('cash-collection-modal')).toBeDefined();
      expect(screen.getByTestId('target-fare-amount').textContent).toContain('₦3,500');

      // Tap ₦5,000 denomination preset -> Change should be ₦1,500
      const preset5000 = screen.getByText('₦5,000');
      fireEvent.click(preset5000);
      expect(screen.getByTestId('change-calculation-box').textContent).toContain('₦1,500');

      // Attempt to submit without ticking confirmation checkbox -> should not proceed
      const submitBtn = screen.getByTestId('btn-confirm-cash-proceed');
      fireEvent.click(submitBtn);
      expect(onConfirmMock).not.toHaveBeenCalled();

      // Tick the confirmation checkbox
      const checkInput = screen.getByTestId('chk-confirm-cash-receipt');
      fireEvent.click(checkInput);

      // Now click submit -> should call onConfirmCollection with 500000 and 150000
      fireEvent.click(submitBtn);
      expect(onConfirmMock).toHaveBeenCalledWith(500000, 150000);
      expect(onCloseMock).toHaveBeenCalled();
    });

    it('deducts 20% platform commission on physical cash collection atomically', async () => {
      const store = useRiderStore.getState();
      expect(store.walletBalanceKobo).toBe(0);

      // Collect ₦10,000 physical cash (1,000,000 kobo)
      // 20% commission is ₦2,000 (200,000 kobo)
      await act(async () => {
        await store.recordCashCollection(1000000);
      });

      expect(useRiderStore.getState().walletBalanceKobo).toBe(-200000);
      expect(useRiderStore.getState().isDebtLocked).toBe(false);
    });

    it('trips the circuit breaker and locks dispatch when debt reaches ₦5,000 (500,000 kobo)', async () => {
      const store = useRiderStore.getState();

      // Cash collection 1: ₦15,000 -> 20% commission = ₦3,000 (-300,000 kobo)
      await act(async () => {
        await store.recordCashCollection(1500000);
      });
      expect(useRiderStore.getState().walletBalanceKobo).toBe(-300000);
      expect(useRiderStore.getState().isDebtLocked).toBe(false);

      // Cash collection 2: ₦12,000 -> 20% commission = ₦2,400 (-240,000 kobo)
      // Total balance = -540,000 kobo (Debt > ₦5,000 limit)
      await act(async () => {
        await store.recordCashCollection(1200000);
      });

      expect(useRiderStore.getState().walletBalanceKobo).toBe(-540000);
      expect(useRiderStore.getState().isDebtLocked).toBe(true);
      expect(useRiderStore.getState().riderStatus).toBe('offline');

      // Attempt to go online while debt-locked -> should remain offline and show toast
      await act(async () => {
        await useRiderStore.getState().toggleOnlineStatus();
      });
      expect(useRiderStore.getState().riderStatus).toBe('offline');
      expect(useRiderStore.getState().toastMessage).toContain('Dispatch Locked: Exceeded ₦5,000');

      // Attempt to accept order while debt-locked -> should be rejected
      const accepted = await useRiderStore.getState().acceptOffer('test-order-id');
      expect(accepted).toBe(false);
    });

    it('renders VirtualDebtMeter with warning threshold and lockout banner', () => {
      const onOpenTopUpMock = vi.fn();

      // Negative balance below threshold
      const { rerender } = render(
        <VirtualDebtMeter
          walletBalanceKobo={-200000} // -₦2,000 (40%)
          isDebtLocked={false}
          onOpenTopUp={onOpenTopUpMock}
        />
      );
      expect(screen.getByTestId('virtual-debt-meter')).toBeDefined();
      expect(screen.getByText(/Current Debt: -₦2,000/i)).toBeDefined();

      // In debt warning threshold (>= 70% of ₦5,000)
      rerender(
        <VirtualDebtMeter
          walletBalanceKobo={-400000} // -₦4,000 (80%)
          isDebtLocked={false}
          onOpenTopUp={onOpenTopUpMock}
        />
      );
      expect(screen.getByText(/80% Limit/i)).toBeDefined();

      // In debt lockout
      rerender(
        <VirtualDebtMeter
          walletBalanceKobo={-520000} // -₦5,200 (> ₦5,000)
          isDebtLocked={true}
          onOpenTopUp={onOpenTopUpMock}
        />
      );
      expect(screen.getByText(/CIRCUIT-BREAKER LOCKED/i)).toBeDefined();
    });

    it('clears virtual debt and restores dispatch privileges after Paystack top-up', async () => {
      // Set initial locked state
      useRiderStore.setState({
        walletBalanceKobo: -540000,
        isDebtLocked: true,
        riderStatus: 'offline',
      });

      const onTopUpSuccessMock = vi.fn();
      const onCloseMock = vi.fn();

      render(
        <VirtualDebtTopUpModal
          isOpen={true}
          onClose={onCloseMock}
          currentBalanceKobo={-540000}
          onTopUpSuccess={onTopUpSuccessMock}
        />
      );

      expect(screen.getByTestId('virtual-debt-topup-modal')).toBeDefined();
      expect(screen.getByText(/-₦5,400/i)).toBeDefined();

      // Perform store top-up with ₦6,000 (+600,000 kobo)
      await act(async () => {
        await useRiderStore.getState().topUpWallet(600000);
      });

      // Balance becomes +₦600 (+60,000 kobo) -> Debt is cleared
      expect(useRiderStore.getState().walletBalanceKobo).toBe(60000);
      expect(useRiderStore.getState().isDebtLocked).toBe(false);
      expect(useRiderStore.getState().riderStatus).toBe('available');
    });
  });

  // ==========================================================================
  // FEATURE 3: Customer Communication & Phone Privacy
  // ==========================================================================
  describe('Feature 3: 1-Tap WhatsApp Direct Connect & Message Templates', () => {
    it('normalizes various Nigerian telephone formats into clean WhatsApp international format', () => {
      expect(cleanNigerianPhoneForWhatsApp('08023456789')).toBe('2348023456789');
      expect(cleanNigerianPhoneForWhatsApp('+234 809 334 8821')).toBe('2348093348821');
      expect(cleanNigerianPhoneForWhatsApp('2348123456789')).toBe('2348123456789');
      expect(cleanNigerianPhoneForWhatsApp('070 555 1234')).toBe('234705551234');
    });

    it('formats all 4 WhatsApp pre-filled logistics templates correctly', () => {
      const party: ContactPartyInfo = {
        name: 'Sarah Jenkins',
        phone: '08023456789',
        role: 'recipient',
        trackingCode: '#BF-48291',
        landmark: 'Victoria Island Towers Gate 2',
      };

      const atGate = WHATSAPP_TEMPLATES.find((t) => t.key === 'at_gate')?.getText(party);
      expect(atGate).toContain('Bayniks Dispatch Rider');
      expect(atGate).toContain('Victoria Island Towers Gate 2');

      const traffic = WHATSAPP_TEMPLATES.find((t) => t.key === 'traffic_delay')?.getText(party);
      expect(traffic).toContain('gridlock');

      const pin = WHATSAPP_TEMPLATES.find((t) => t.key === 'pin_reminder')?.getText(party);
      expect(pin).toContain('handover PIN');

      const callMe = WHATSAPP_TEMPLATES.find((t) => t.key === 'call_me')?.getText(party);
      expect(callMe).toContain('Sarah Jenkins');

      const waUrl = buildWhatsAppUrl(party, 'at_gate');
      expect(waUrl).toContain('https://wa.me/2348023456789?text=');
    });

    it('renders RiderContactModal with NDPR privacy badge, direct calling, and template selectors', () => {
      const onCloseMock = vi.fn();
      const party: ContactPartyInfo = {
        name: 'Michael Ade',
        phone: '08099887766',
        role: 'sender',
        trackingCode: '#BF-100',
        landmark: 'Computer Village Otigba St',
      };

      render(
        <RiderContactModal
          isOpen={true}
          onClose={onCloseMock}
          party={party}
        />
      );

      expect(screen.getByTestId('rider-contact-modal')).toBeDefined();
      expect(screen.getByText(/Contact Michael Ade/i)).toBeDefined();
      expect(screen.getByText(/NDPR Phone Masking Active/i)).toBeDefined();
      expect(screen.getByTestId('btn-direct-phone-call')).toBeDefined();
      expect(screen.getByTestId('btn-send-whatsapp')).toBeDefined();
    });
  });

  // ==========================================================================
  // FEATURE 7: Hardware Battery Optimization & Mock-Location Defense
  // ==========================================================================
  describe('Feature 7: Battery Optimization & Anti-Cheat Mock-Location Defense', () => {
    it('auto-throttles GPS location telemetry when battery <= 15% and unplugged', () => {
      // 90% unplugged -> normal
      const normalStatus = batteryOptimizationService.simulateBatteryStatus(90, false);
      expect(normalStatus.isLowBatteryThrottled).toBe(false);

      // 12% unplugged -> throttled
      const lowStatus = batteryOptimizationService.simulateBatteryStatus(12, false);
      expect(lowStatus.isLowBatteryThrottled).toBe(true);

      // 10% but charging -> normal (rider has power bank on motorcycle)
      const chargingStatus = batteryOptimizationService.simulateBatteryStatus(10, true);
      expect(chargingStatus.isLowBatteryThrottled).toBe(false);
    });

    it('detects simulated Android mock location providers and teleportation anomalies', () => {
      // Genuine satellite GPS
      const genuineCheck = detectMockLocation({
        latitude: 6.5244,
        longitude: 3.3792,
        accuracy: 4.2,
        speed: 15,
        simulated: false,
      });
      expect(genuineCheck.isMockLocation).toBe(false);

      // Simulated flag detected
      const simCheck = detectMockLocation({
        latitude: 6.5244,
        longitude: 3.3792,
        accuracy: 5.0,
        speed: 10,
        simulated: true,
      });
      expect(simCheck.isMockLocation).toBe(true);
      expect(simCheck.reason).toContain('Mock Location provider');

      // Zero or negative accuracy (typical of low-grade Fake GPS APKs)
      const badAccCheck = detectMockLocation({
        latitude: 6.5244,
        longitude: 3.3792,
        accuracy: 0,
        speed: 10,
      });
      expect(badAccCheck.isMockLocation).toBe(true);

      // Impossible Lagos teleportation speed (>160 km/h)
      const speedCheck = detectMockLocation({
        latitude: 6.5244,
        longitude: 3.3792,
        accuracy: 5.0,
        speed: 60, // 60 m/s = 216 km/h
      });
      expect(speedCheck.isMockLocation).toBe(true);
      expect(speedCheck.reason).toContain('>160 km/h');
    });

    it('renders MockLocationWarningModal and blocks false arrivals until cleared', () => {
      const onDismissMock = vi.fn();
      const onRecheckMock = vi.fn();

      render(
        <MockLocationWarningModal
          isOpen={true}
          reason="Android mock location provider has been detected"
          onDismiss={onDismissMock}
          onRecheckLocation={onRecheckMock}
        />
      );

      expect(screen.getByTestId('mock-location-warning-modal')).toBeDefined();
      expect(screen.getByText(/Mock Location Detected/i)).toBeDefined();
      expect(screen.getByText(/Select mock location app/i)).toBeDefined();

      const dismissBtn = screen.getByTestId('btn-dismiss-mock-warning');
      fireEvent.click(dismissBtn);
      expect(onDismissMock).toHaveBeenCalled();
    });
  });
});
