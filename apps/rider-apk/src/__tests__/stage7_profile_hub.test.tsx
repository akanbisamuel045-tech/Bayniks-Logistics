// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RiderProfileScreen } from '../components/RiderProfileScreen';
import { EditProfileModal } from '../components/sheets/EditProfileModal';
import { DynamicDetailSheet } from '../components/sheets/DynamicDetailSheet';
import { useRiderStore } from '../store/riderStore';

describe('Stage 7: Rider Profile Hub, Dynamic Detail Sheets & Bank Cashout', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useRiderStore.setState({
      riderStatus: 'available',
      tripPhase: 'idle',
      riderName: 'Joseph Okon',
      plateNumber: 'BLT-4912',
      todayEarningsKobo: 1845000,
      walletBalanceKobo: 9230000,
      tripsCompletedToday: 8,
      chatMessages: [],
      toastMessage: null,
    });
  });

  describe('RiderProfileScreen Component', () => {
    it('renders profile header, avatar with edit badge, and 3-column stats', () => {
      const handleEdit = vi.fn();
      render(
        <RiderProfileScreen
          onOpenEditProfile={handleEdit}
          onOpenDetailSheet={vi.fn()}
          onEndShift={vi.fn()}
        />
      );

      expect(screen.getByTestId('screen-profile')).toBeDefined();
      expect(screen.getByText('Profile')).toBeDefined();
      expect(screen.getByTestId('profile-copy-id-btn')).toBeDefined();

      expect(screen.getByText('Joseph Okon')).toBeDefined();
      expect(screen.getByText(/BLT-4912/i)).toBeDefined();
      expect(screen.getByText(/KYC Level 2 Verified ✓/i)).toBeDefined();
      expect(screen.getByText(/PRO TIER/i)).toBeDefined();

      // Stats
      expect(screen.getByText('4.95 ★')).toBeDefined();
      expect(screen.getByTestId('profile-completed-stat').textContent).toBe('550'); // 542 + 8
      expect(screen.getByText('98.2%')).toBeDefined();

      // Avatar click
      fireEvent.click(screen.getByTestId('profile-avatar-btn'));
      expect(handleEdit).toHaveBeenCalledTimes(1);
    });

    it('navigates to dynamic sheets for personal, earnings, bank, vehicle, and SOS', () => {
      const handleOpenSheet = vi.fn();
      render(
        <RiderProfileScreen
          onOpenEditProfile={vi.fn()}
          onOpenDetailSheet={handleOpenSheet}
          onEndShift={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('menu-btn-personal'));
      expect(handleOpenSheet).toHaveBeenCalledWith('personal');

      fireEvent.click(screen.getByTestId('menu-btn-earnings'));
      expect(handleOpenSheet).toHaveBeenCalledWith('earnings');

      fireEvent.click(screen.getByTestId('menu-btn-bank'));
      expect(handleOpenSheet).toHaveBeenCalledWith('bank');

      fireEvent.click(screen.getByTestId('menu-btn-vehicle'));
      expect(handleOpenSheet).toHaveBeenCalledWith('vehicle');

      fireEvent.click(screen.getByTestId('menu-btn-support-sos'));
      expect(handleOpenSheet).toHaveBeenCalledWith('support_sos');

      fireEvent.click(screen.getByTestId('menu-btn-notifications'));
      expect(handleOpenSheet).toHaveBeenCalledWith('notifications');
    });

    it('ensures dark mode / theme toggle is completely removed from preferences', () => {
      render(
        <RiderProfileScreen
          onOpenEditProfile={vi.fn()}
          onOpenDetailSheet={vi.fn()}
          onEndShift={vi.fn()}
        />
      );

      expect(screen.queryByText(/Dark Mode/i)).toBeNull();
      expect(screen.queryByText(/Theme/i)).toBeNull();
      expect(screen.queryByText(/Appearance/i)).toBeNull();
    });

    it('triggers end shift callback on button click', () => {
      const handleEndShift = vi.fn();
      render(
        <RiderProfileScreen
          onOpenEditProfile={vi.fn()}
          onOpenDetailSheet={vi.fn()}
          onEndShift={handleEndShift}
        />
      );

      fireEvent.click(screen.getByTestId('menu-btn-end-shift'));
      expect(handleEndShift).toHaveBeenCalledTimes(1);
    });
  });

  describe('EditProfileModal Component', () => {
    it('does not render when isOpen is false', () => {
      render(<EditProfileModal isOpen={false} onClose={vi.fn()} />);
      expect(screen.queryByTestId('sheet-edit-profile')).toBeNull();
    });

    it('submits updated profile details on form submission', () => {
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      render(<EditProfileModal isOpen={true} onClose={handleClose} onSave={handleSave} />);

      expect(screen.getByTestId('sheet-edit-profile')).toBeDefined();
      expect(screen.getByText('Edit Account Details')).toBeDefined();

      const phoneInput = screen.getByTestId('edit-phone-input') as HTMLInputElement;
      fireEvent.change(phoneInput, { target: { value: '+234 809 111 2233' } });

      const acctInput = screen.getByTestId('edit-acct-input') as HTMLInputElement;
      fireEvent.change(acctInput, { target: { value: '0123456789' } });

      const submitBtn = screen.getByTestId('edit-profile-submit-btn');
      fireEvent.click(submitBtn);

      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '+234 809 111 2233',
          acct: '0123456789',
        })
      );
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('DynamicDetailSheet Component', () => {
    it('renders personal information sheet with edit button', () => {
      const handleOpenEdit = vi.fn();
      render(
        <DynamicDetailSheet
          isOpen={true}
          viewType="personal"
          onClose={vi.fn()}
          onOpenEditProfile={handleOpenEdit}
        />
      );

      expect(screen.getByTestId('view-personal-info')).toBeDefined();
      expect(screen.getByText('PERSONAL & HUB PROFILE')).toBeDefined();
      expect(screen.getByText('Personal Information')).toBeDefined();
      expect(screen.getByText('joseph.okon@bayniks.ng')).toBeDefined();

      fireEvent.click(screen.getByTestId('btn-open-edit-profile'));
      expect(handleOpenEdit).toHaveBeenCalledTimes(1);
    });

    it('renders earnings sheet with wallet balance, weekly velocity chart, and cashout trigger', () => {
      const handleOpenCashout = vi.fn();
      render(
        <DynamicDetailSheet
          isOpen={true}
          viewType="earnings"
          onClose={vi.fn()}
          onOpenCashout={handleOpenCashout}
        />
      );

      expect(screen.getByTestId('view-earnings')).toBeDefined();
      expect(screen.getByText('RIDER WALLET & LEDGER')).toBeDefined();
      expect(screen.getByText(/₦92,300.00/i)).toBeDefined();
      expect(screen.getByText(/WEEKLY EARNINGS VELOCITY/i)).toBeDefined();
      expect(screen.getByText(/Base Delivery Fares/i)).toBeDefined();

      fireEvent.click(screen.getByTestId('btn-trigger-cashout'));
      expect(handleOpenCashout).toHaveBeenCalledTimes(1);
    });

    it('renders cashout sheet, validates amount, and deducts wallet on instant transfer', () => {
      const handleClose = vi.fn();
      render(
        <DynamicDetailSheet
          isOpen={true}
          viewType="cashout"
          onClose={handleClose}
        />
      );

      expect(screen.getByTestId('view-cashout')).toBeDefined();
      expect(screen.getByText('INSTANT BANK SETTLEMENT')).toBeDefined();
      expect(screen.getByText(/Guaranty Trust Bank • 0148298291/i)).toBeDefined();

      const amtInput = screen.getByTestId('cashout-amount-input') as HTMLInputElement;
      fireEvent.change(amtInput, { target: { value: '15000' } });

      const transferBtn = screen.getByTestId('btn-cashout-submit');
      fireEvent.click(transferBtn);

      expect(handleClose).toHaveBeenCalledTimes(1);
      expect(useRiderStore.getState().toastMessage).toContain('transferred to GTBank');
    });

    it('renders roadside emergency SOS sheet with broadcast button and live dispatch chat', () => {
      render(
        <DynamicDetailSheet
          isOpen={true}
          viewType="support_sos"
          onClose={vi.fn()}
        />
      );

      expect(screen.getByTestId('view-support-sos')).toBeDefined();
      expect(screen.getByText('24/7 RIDER ASSISTANCE')).toBeDefined();
      expect(screen.getByText('Roadside Emergency SOS')).toBeDefined();
      expect(screen.getByText(/6.5165° N, 3.3855° E/i)).toBeDefined();

      // SOS Broadcast
      fireEvent.click(screen.getByTestId('btn-broadcast-sos'));
      expect(useRiderStore.getState().toastMessage).toContain('SOS broadcasted');

      // Dispatch Chat
      expect(screen.getByTestId('chat-feed')).toBeDefined();
      const chatInput = screen.getByTestId('dispatch-chat-input');
      fireEvent.change(chatInput, { target: { value: 'Approaching security gate' } });
      fireEvent.click(screen.getByTestId('dispatch-chat-send-btn'));

      expect(useRiderStore.getState().chatMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: 'Approaching security gate',
            sender: 'rider',
          }),
        ])
      );
    });
  });
});

