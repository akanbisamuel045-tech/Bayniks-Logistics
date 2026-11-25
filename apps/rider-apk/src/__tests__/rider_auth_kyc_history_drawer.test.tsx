// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { useRiderStore } from '../store/riderStore';
import { RiderAuthModal } from '../components/RiderAuthModal';
import { RiderKycScreen } from '../components/RiderKycScreen';
import { DeliveryHistoryScreen } from '../components/DeliveryHistoryScreen';
import { RiderNavigationDrawer } from '../components/RiderNavigationDrawer';
import { RiderSettingsScreen } from '../components/RiderSettingsScreen';

const testDeliveries = [
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
    status: 'delivered' as const,
    proofType: 'pin' as const,
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
    status: 'delivered' as const,
    proofType: 'qr' as const,
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
    status: 'delivered' as const,
    proofType: 'pin' as const,
    pinUsed: '3190',
    packageType: 'Spare Parts • Machine Component (4.2kg)',
    recipientName: 'Engineer Kolawole',
    recipientPhone: '+2348123334455',
    rating: 5,
  },
];

describe('Rider App: Auth, KYC, Delivery History & Left Drawer Suite', () => {
  beforeEach(() => {
    useRiderStore.setState({
      riderName: 'Babajide Adeleke',
      plateNumber: 'KJA-824-XY',
      riderStatus: 'available',
      kycStatus: 'approved',
      isLoggedIn: true,
      todayEarningsKobo: 1850000,
      activeTab: 'home',
      isDrawerOpen: false,
      isAuthModalOpen: false,
      deliveryHistory: testDeliveries,
    });
  });

  afterEach(() => {
    cleanup();
  });

  /* -------------------------------------------------------------
   * 1. Dispatch Rider Login & Account Creation
   * ----------------------------------------------------------- */
  describe('1. Rider Authentication (Login & Registration Flow)', () => {
    it('is strictly contained within mobile-app-shell with absolute positioning', () => {
      render(<RiderAuthModal isOpen={true} onClose={vi.fn()} initialMode="login" />);

      const authModal = screen.getByTestId('rider-auth-modal');
      expect(authModal.className).toContain('absolute');
      expect(authModal.className).toContain('inset-0');
      expect(authModal.className).not.toContain('fixed');
    });

    it('renders login tab with phone and password inputs', () => {
      render(<RiderAuthModal isOpen={true} onClose={vi.fn()} initialMode="login" />);

      expect(screen.getByText(/Rider Cockpit Sign-In/i)).toBeDefined();
      expect(screen.getByText(/Sign In to Cockpit/i)).toBeDefined();
      expect(screen.getByText(/One-Tap Demo Rider Sign-In/i)).toBeDefined();
    });

    it('switches between Sign In and Create Account tabs', () => {
      render(<RiderAuthModal isOpen={true} onClose={vi.fn()} initialMode="login" />);

      const createAccountBtn = screen.getByRole('button', { name: /Create Account/i });
      fireEvent.click(createAccountBtn);

      expect(screen.getByRole('heading', { name: /^Become a driver$/i })).toBeDefined();
      expect(screen.getByText(/^Email address$/i)).toBeDefined();
      expect(screen.getByText(/^City$/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Register as a driver/i })).toBeDefined();
    });

    it('executes one-tap demo login and closes modal', async () => {
      const handleClose = vi.fn();
      render(<RiderAuthModal isOpen={true} onClose={handleClose} initialMode="login" />);

      const demoBtn = screen.getByRole('button', { name: /One-Tap Demo Rider Sign-In/i });
      fireEvent.click(demoBtn);

      await waitFor(() => {
        expect(handleClose).toHaveBeenCalled();
      });
      expect(useRiderStore.getState().isLoggedIn).toBe(true);
    });

    it('validates 6-digit OTP entry and auto-advances', async () => {
      const onCloseMock = vi.fn();
      render(<RiderAuthModal isOpen={true} onClose={onCloseMock} initialMode="login" />);

      // Switch to register then submit form to advance to OTP
      const createAccountBtn = screen.getByRole('button', { name: /Create Account/i });
      fireEvent.click(createAccountBtn);

      fireEvent.change(screen.getByPlaceholderText(/Enter email address/i), { target: { value: 'tariq@bayniks.ng' } });
      fireEvent.change(screen.getByPlaceholderText(/803 123 4567/i), { target: { value: '08012345678' } });
      const termsCheckbox = screen.getByRole('checkbox');
      fireEvent.click(termsCheckbox);

      const form = screen.getByRole('heading', { name: /^Become a driver$/i }).closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      // Step 1: Verification method selection screen (Image 1)
      await waitFor(() => {
        expect(screen.getByText(/Choose the verification method/i)).toBeDefined();
        expect(screen.getByTestId('get-code-sms-btn')).toBeDefined();
        expect(screen.getByTestId('get-code-whatsapp-btn')).toBeDefined();
      });

      // User selects SMS delivery method
      const smsBtn = screen.getByTestId('get-code-sms-btn');
      fireEvent.click(smsBtn);

      // Step 2: Enter code screen (Image 2)
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Enter code$/i })).toBeDefined();
        expect(screen.getByText(/Your verification code has been sent/i)).toBeDefined();
        expect(screen.getByRole('button', { name: /Verify & Complete Registration/i })).toBeDefined();
      });

      // User enters the 6 digits in the centered code input box
      const otpInput = document.getElementById('rider-otp-input') as HTMLInputElement;
      expect(otpInput).toBeDefined();
      fireEvent.change(otpInput, { target: { value: '123456' } });

      // Submit verification
      const verifyBtn = screen.getByRole('button', { name: /Verify & Complete Registration/i });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(useRiderStore.getState().isLoggedIn).toBe(true);
        expect(useRiderStore.getState().activeTab).toBe('kyc');
        expect(onCloseMock).toHaveBeenCalled();
      });
    });

    it('triggers onCompleteRegistration callback upon OTP verification', async () => {
      const onCompleteRegistrationMock = vi.fn();
      render(
        <RiderAuthModal
          isOpen={true}
          onClose={vi.fn()}
          onCompleteRegistration={onCompleteRegistrationMock}
          initialMode="otp"
        />
      );

      const otpInput = document.getElementById('rider-otp-input') as HTMLInputElement;
      expect(otpInput).toBeDefined();
      fireEvent.change(otpInput, { target: { value: '123456' } });

      const verifyBtn = screen.getByRole('button', { name: /Verify & Complete Registration/i });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(onCompleteRegistrationMock).toHaveBeenCalled();
        expect(useRiderStore.getState().activeTab).toBe('kyc');
      });
    });
  });

  /* -------------------------------------------------------------
   * 2. Rider KYC Registration & Account Setup Checklist
   * ----------------------------------------------------------- */
  describe('2. Rider KYC & Regulatory Compliance', () => {
    it('renders KYC account setup screen with reference layout and accordions', () => {
      render(<RiderKycScreen onBack={vi.fn()} />);

      expect(screen.getByRole('heading', { name: /Let's set up your account/i })).toBeDefined();
      expect(screen.getByText(/Complete the steps in any order/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Continue later/i })).toBeDefined();
      expect(screen.getByText(/Registering for/i)).toBeDefined();
      expect(screen.getByText(/2-3 wheeler/i)).toBeDefined();

      // Accordion Section Headers
      expect(screen.getByText(/^Personal details$/i)).toBeDefined();
      expect(screen.getByText(/^Vehicle details$/i)).toBeDefined();
      expect(screen.getByText(/^Payment details$/i)).toBeDefined();

      // Required and Optional items
      expect(screen.getByText(/^Start here$/i)).toBeDefined();
      expect(screen.getByText(/^Personal information$/i)).toBeDefined();
      expect(screen.getByText(/^NIN Slip$/i)).toBeDefined();
      expect(screen.getByText(/^Driver's profile photo$/i)).toBeDefined();
      expect(screen.getByText(/^Vehicle information$/i)).toBeDefined();
      expect(screen.getByText(/^Exterior Photo of your Vehicle$/i)).toBeDefined();
      expect(screen.getByText(/^Payment information$/i)).toBeDefined();

      // Submit section
      expect(screen.getByText(/Complete all steps to submit/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Submit registration/i })).toBeDefined();
    });

    it('opens sub-modal upon tapping an item', () => {
      render(<RiderKycScreen onBack={vi.fn()} />);

      const personalInfoItem = screen.getByText(/^Personal information$/i);
      fireEvent.click(personalInfoItem);

      expect(screen.getAllByRole('heading', { name: /^Personal details$/i }).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText(/First name \*/i)).toBeDefined();
    });

    it('calls onBack when tapping Continue later', () => {
      const handleBack = vi.fn();
      render(<RiderKycScreen onBack={handleBack} />);

      const continueLaterBtn = screen.getByRole('button', { name: /Continue later/i });
      fireEvent.click(continueLaterBtn);

      expect(handleBack).toHaveBeenCalled();
    });

    it('redirects to homepage when Submit registration is clicked', async () => {
      const handleBack = vi.fn();
      const handleComplete = vi.fn();
      render(<RiderKycScreen onBack={handleBack} onComplete={handleComplete} />);

      const submitBtn = screen.getByRole('button', { name: /Submit registration/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(handleComplete).toHaveBeenCalled();
      });
      expect(useRiderStore.getState().activeTab).toBe('home');
    });
  });

  /* -------------------------------------------------------------
   * 3. Ride History & Trip Detail Receipt
   * ----------------------------------------------------------- */
  describe('3. Delivery History & Electronic Waybill', () => {
    it('renders Ride history list with store records formatted in Naira', () => {
      render(<DeliveryHistoryScreen onBack={vi.fn()} />);

      expect(screen.getByText(/^Ride history$/i)).toBeDefined();
      expect(screen.getByText(/Otigba Street, Computer Village, Ikeja/i)).toBeDefined();
      expect(screen.getByText(/₦5,000/i)).toBeDefined();
      expect(screen.getAllByText(/Journey finished/i).length).toBeGreaterThan(0);
    });

    it('opens full-screen Trip Detail view on clicking a ride row', () => {
      render(<DeliveryHistoryScreen onBack={vi.fn()} />);

      const firstRow = screen.getByTestId('ride-row-LGS-849201');
      fireEvent.click(firstRow);

      expect(screen.getByTestId('trip-receipt-modal')).toBeDefined();
      expect(screen.getByText(/Cash payment/i)).toBeDefined();
      expect(screen.getByText(/Customer paid/i)).toBeDefined();
      expect(screen.getByText(/Compensated by Bayniks/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Get help with ride/i })).toBeDefined();
    });

    it('opens Support -> Ride issues and navigates to Get help with something else', () => {
      render(<DeliveryHistoryScreen onBack={vi.fn()} />);

      fireEvent.click(screen.getByTestId('ride-row-LGS-849201'));
      fireEvent.click(screen.getByTestId('get-help-with-ride-btn'));

      expect(screen.getByText(/^Ride issues$/i)).toBeDefined();
      expect(screen.getByText(/My Bayniks Driver app crashed/i)).toBeDefined();

      fireEvent.click(screen.getByTestId('support-issue-other'));
      expect(screen.getByText(/Get help with something else/i)).toBeDefined();
      expect(screen.getByText(/Driving with Bayniks/i)).toBeDefined();
    });
  });

  /* -------------------------------------------------------------
   * 4. Left Navigation Sidebar Drawer
   * ----------------------------------------------------------- */
  describe('4. Left Sidebar Navigation Drawer', () => {
    it('is strictly contained within mobile-app-shell with absolute positioning', () => {
      render(
        <RiderNavigationDrawer
          isOpen={true}
          onClose={vi.fn()}
          onNavigate={vi.fn()}
        />
      );

      const drawer = screen.getByTestId('rider-navigation-drawer');
      expect(drawer.className).toContain('absolute');
      expect(drawer.className).toContain('inset-0');
      expect(drawer.className).not.toContain('fixed');
    });

    it('renders left drawer with rider profile header and excludes Settings and Campaigns', () => {
      render(
        <RiderNavigationDrawer
          isOpen={true}
          onClose={vi.fn()}
          onNavigate={vi.fn()}
        />
      );

      expect(screen.getByText(/BAYNIKS COURIER/i)).toBeDefined();
      expect(screen.getByText(/Babajide Adeleke/i)).toBeDefined();
      expect(screen.getByText(/^Earnings$/i)).toBeDefined();
      expect(screen.getByText(/Trip history/i)).toBeDefined();
      expect(screen.getByText(/Scheduled rides/i)).toBeDefined();
      expect(screen.getByText(/Driver Portal/i)).toBeDefined();
      expect(screen.getByText(/Privacy/i)).toBeDefined();

      expect(screen.queryByText(/^Settings$/i)).toBeNull();
      expect(screen.queryByTestId('drawer-settings-btn')).toBeNull();
      expect(screen.queryByText(/Campaigns/i)).toBeNull();
      expect(screen.queryByText(/Bronze/i)).toBeNull();
    });

    it('navigates to target view when menu item is clicked', () => {
      const handleNavigate = vi.fn();
      const handleClose = vi.fn();
      render(
        <RiderNavigationDrawer
          isOpen={true}
          onClose={handleClose}
          onNavigate={handleNavigate}
        />
      );

      const historyLink = screen.getByRole('button', { name: /Trip history/i });
      fireEvent.click(historyLink);

      expect(handleClose).toHaveBeenCalled();
      expect(handleNavigate).toHaveBeenCalledWith('history');
    });

    it('renders direct Log out button on Settings page and triggers logout cleanly', () => {
      render(
        <RiderSettingsScreen
          onOpenKyc={vi.fn()}
          onOpenSupport={vi.fn()}
        />
      );

      const directLogoutBtn = screen.getByTestId('settings-logout-btn');
      expect(directLogoutBtn).toBeDefined();
      expect(directLogoutBtn.textContent).toContain('Log out');
      fireEvent.click(directLogoutBtn);

      expect(useRiderStore.getState().isLoggedIn).toBe(false);
      expect(useRiderStore.getState().riderStatus).toBe('offline');
      expect(useRiderStore.getState().activeTab).toBe('home');
    });
  });
});
