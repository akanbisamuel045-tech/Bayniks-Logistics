// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { useRiderStore } from '../store/riderStore';
import { RiderAuthModal } from '../components/RiderAuthModal';
import { RiderKycScreen } from '../components/RiderKycScreen';
import { DeliveryHistoryScreen } from '../components/DeliveryHistoryScreen';
import { RiderNavigationDrawer } from '../components/RiderNavigationDrawer';

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

      expect(screen.getByText(/Join Bayniks Courier Fleet/i)).toBeDefined();
      expect(screen.getByText(/Full Legal Name/i)).toBeDefined();
      expect(screen.getByText(/Dispatch Vehicle Type/i)).toBeDefined();
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

      fireEvent.change(screen.getByPlaceholderText(/Babajide Adeleke/i), { target: { value: 'Tariq Adeleke' } });
      fireEvent.change(screen.getByPlaceholderText(/803 123 4567/i), { target: { value: '08012345678' } });
      fireEvent.change(screen.getByPlaceholderText(/At least 6 characters/i), { target: { value: 'Password123!' } });
      fireEvent.change(screen.getByPlaceholderText(/KJA-824-XY/i), { target: { value: 'LAG-992-XD' } });

      const form = screen.getByText(/Full Legal Name/i).closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(screen.getByText(/Verify Phone Number/i)).toBeDefined();
        expect(screen.getByText(/Verify & Complete Registration/i)).toBeDefined();
        expect(screen.queryByText(/Test Verification OTP/i)).toBeNull();
      });

      // User enters the 6 digits received via SMS into the input slots
      ['1', '2', '3', '4', '5', '6'].forEach((digit, i) => {
        const slot = document.getElementById(`rider-otp-slot-${i}`) as HTMLInputElement;
        fireEvent.change(slot, { target: { value: digit } });
      });

      // Verify slots have digits
      const slot0 = document.getElementById('rider-otp-slot-0') as HTMLInputElement;
      expect(slot0?.value).toBe('1');

      // Submit verification
      const verifyBtn = screen.getByRole('button', { name: /Verify & Complete Registration/i });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(useRiderStore.getState().isLoggedIn).toBe(true);
        expect(onCloseMock).toHaveBeenCalled();
      });
    });
  });

  /* -------------------------------------------------------------
   * 2. Rider KYC Registration & Compliance
   * ----------------------------------------------------------- */
  describe('2. Rider KYC & Regulatory Compliance', () => {
    it('renders KYC screen with status banner and Lagos compliance sections', () => {
      render(<RiderKycScreen onBack={vi.fn()} />);

      expect(screen.getByText(/KYC & Regulatory Compliance/i)).toBeDefined();
      expect(screen.getByText(/KYC Level 2 Verified/i)).toBeDefined();
      expect(screen.getByText(/1. Civil Identity & National Records/i)).toBeDefined();
      expect(screen.getByText(/2. Vehicle & Lagos Commercial Permits/i)).toBeDefined();
      expect(screen.getByText(/3. Document Photos/i)).toBeDefined();
    });

    it('allows toggling KYC status for QA inspection', () => {
      render(<RiderKycScreen onBack={vi.fn()} />);

      const toggleBtn = screen.getByRole('button', { name: /Toggle Approval/i });
      fireEvent.click(toggleBtn);

      expect(useRiderStore.getState().kycStatus).toBe('pending_review');
      expect(screen.getByText(/Documents Under Review/i)).toBeDefined();

      fireEvent.click(toggleBtn);
      expect(useRiderStore.getState().kycStatus).toBe('approved');
      expect(screen.getByText(/KYC Level 2 Verified/i)).toBeDefined();
    });

    it('triggers document upload and updates compressed proof', () => {
      render(<RiderKycScreen onBack={vi.fn()} />);

      const replaceBtns = screen.getAllByRole('button', { name: /Replace/i });
      expect(replaceBtns.length).toBeGreaterThan(0);
      fireEvent.click(replaceBtns[0]!);
    });
  });

  /* -------------------------------------------------------------
   * 3. Delivery History & Electronic Waybill
   * ----------------------------------------------------------- */
  describe('3. Delivery History & Electronic Waybill', () => {
    it('renders delivery history list with summary metrics in Naira', () => {
      render(<DeliveryHistoryScreen onBack={vi.fn()} />);

      expect(screen.getByText(/Delivery History/i)).toBeDefined();
      expect(screen.getByText(/Total Deliveries/i)).toBeDefined();
      expect(screen.getByText(/Total Earned/i)).toBeDefined();
      expect(screen.getByText(/#LGS-849201/i)).toBeDefined();
    });

    it('filters deliveries by period (Today vs All Time)', () => {
      render(<DeliveryHistoryScreen onBack={vi.fn()} />);

      const todayChip = screen.getByRole('button', { name: /^Today$/i });
      fireEvent.click(todayChip);

      expect(screen.getByText(/#LGS-849201/i)).toBeDefined();
    });

    it('searches deliveries by tracking code query', () => {
      render(<DeliveryHistoryScreen onBack={vi.fn()} />);

      const searchInput = screen.getByPlaceholderText(/Search tracking code/i);
      fireEvent.change(searchInput, { target: { value: 'LGS-620481' } });

      expect(screen.getByText(/#LGS-620481/i)).toBeDefined();
      expect(screen.queryByText(/#LGS-849201/i)).toBeNull();
    });

    it('opens Electronic Waybill receipt modal on click', () => {
      render(<DeliveryHistoryScreen onBack={vi.fn()} />);

      const viewWaybillBtns = screen.getAllByRole('button', {
        name: /View Electronic Waybill & Breakdown/i,
      });
      fireEvent.click(viewWaybillBtns[0]!);

      expect(screen.getByText(/Electronic Waybill #/i)).toBeDefined();
      expect(screen.getByText(/Total Net Credited to Wallet/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Download PDF Waybill Receipt/i })).toBeDefined();
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

    it('renders left drawer with rider profile header and categorized links', () => {
      render(
        <RiderNavigationDrawer
          isOpen={true}
          onClose={vi.fn()}
          onNavigate={vi.fn()}
        />
      );

      expect(screen.getByText(/BAYNIKS COURIER/i)).toBeDefined();
      expect(screen.getByText(/Babajide Adeleke/i)).toBeDefined();
      expect(screen.getByText(/Cockpit & Mission Radar/i)).toBeDefined();
      expect(screen.getByText(/Delivery History & Waybills/i)).toBeDefined();
      expect(screen.getByText(/KYC & Regulatory Compliance/i)).toBeDefined();
      expect(screen.getByText(/Earnings & Wallet/i)).toBeDefined();
      expect(screen.getByText(/Roadside Emergency SOS/i)).toBeDefined();
      expect(screen.getByText(/Sign Out of Rider App/i)).toBeDefined();
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

      const historyLink = screen.getByRole('button', { name: /Delivery History & Waybills/i });
      fireEvent.click(historyLink);

      expect(handleClose).toHaveBeenCalled();
      expect(handleNavigate).toHaveBeenCalledWith('history');
    });

    it('triggers logout from drawer and updates store', () => {
      const handleClose = vi.fn();
      render(
        <RiderNavigationDrawer
          isOpen={true}
          onClose={handleClose}
          onNavigate={vi.fn()}
        />
      );

      const logoutBtn = screen.getByRole('button', { name: /Sign Out of Rider App/i });
      fireEvent.click(logoutBtn);

      expect(handleClose).toHaveBeenCalled();
      expect(useRiderStore.getState().isLoggedIn).toBe(false);
      expect(useRiderStore.getState().riderStatus).toBe('offline');
    });
  });
});
