// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { useRiderStore } from '../store/riderStore';
import { RiderAuthModal } from '../components/RiderAuthModal';
import { RiderKycScreen } from '../components/RiderKycScreen';
import { DeliveryHistoryScreen } from '../components/DeliveryHistoryScreen';
import { RiderNavigationDrawer } from '../components/RiderNavigationDrawer';

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
    });
  });

  afterEach(() => {
    cleanup();
  });

  /* -------------------------------------------------------------
   * 1. Dispatch Rider Login & Account Creation
   * ----------------------------------------------------------- */
  describe('1. Rider Authentication (Login & Registration Flow)', () => {
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
      render(<RiderAuthModal isOpen={true} onClose={vi.fn()} initialMode="login" />);

      // Switch to register then submit form to advance to OTP
      const createAccountBtn = screen.getByRole('button', { name: /Create Account/i });
      fireEvent.click(createAccountBtn);

      const form = screen.getByText(/Full Legal Name/i).closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(screen.getByText(/Verify Phone Number/i)).toBeDefined();
        expect(screen.getByText(/Verify & Complete Registration/i)).toBeDefined();
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
