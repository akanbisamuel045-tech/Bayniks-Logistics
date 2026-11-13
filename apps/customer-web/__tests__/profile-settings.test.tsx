import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileSettingsView } from '../components/ProfileSettingsView';
import { ThemeProvider } from '../components/ThemeProvider';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Stage 16: Profile, Edit Profile & Settings Suite', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('1. Profile Overview Subview Rendering & Navigation', () => {
    it('renders profile identity details, PRO badge, and delivery balance', () => {
      render(
        <ThemeProvider>
          <ProfileSettingsView initialTab="profile" />
        </ThemeProvider>
      );

      expect(screen.getByRole('heading', { name: /Account & Profile/i })).toBeDefined();
      expect(screen.getByText('Kainul Stevano')).toBeDefined();
      expect(screen.getByText('PRO')).toBeDefined();
      expect(screen.getByText(/\+234 812 345 6789/i)).toBeDefined();
      expect(screen.getByText(/kainul\.designs@boltmail\.com/i)).toBeDefined();
      expect(screen.getByText(/@kainul_stevano • Kainul Studios & Logistics LTD/i)).toBeDefined();
      expect(screen.getByText(/₦45,200\.00/i)).toBeDefined();
    });

    it('renders all core workstation navigation items', () => {
      render(
        <ThemeProvider>
          <ProfileSettingsView initialTab="profile" />
        </ThemeProvider>
      );

      expect(screen.getByText(/Active Deliveries/i)).toBeDefined();
      expect(screen.getByText(/Repeat Delivery Templates/i)).toBeDefined();
      expect(screen.getByText(/Schedule a Delivery/i)).toBeDefined();
      expect(screen.getByText(/Saved Addresses/i)).toBeDefined();
      expect(screen.getByText(/Payment Methods & Cards/i)).toBeDefined();
      expect(screen.getByText(/Delivery Waybill Archive/i)).toBeDefined();
      expect(screen.getByText(/Chat with Courier \(Tariq\)/i)).toBeDefined();
      expect(screen.getByText(/24\/7 Support & Help Center/i)).toBeDefined();
      expect(screen.getByText(/Notifications/i)).toBeDefined();
      expect(screen.getByText(/App Settings & Security/i)).toBeDefined();
    });

    it('navigates to relevant routes when menu items are clicked', () => {
      render(
        <ThemeProvider>
          <ProfileSettingsView initialTab="profile" />
        </ThemeProvider>
      );

      // Active Deliveries
      fireEvent.click(screen.getByText(/Active Deliveries/i));
      expect(mockPush).toHaveBeenCalledWith('/deliveries');

      // Repeat Templates
      fireEvent.click(screen.getByText(/Repeat Delivery Templates/i));
      expect(mockPush).toHaveBeenCalledWith('/repeat');

      // Schedule Delivery
      fireEvent.click(screen.getByText(/Schedule a Delivery/i));
      expect(mockPush).toHaveBeenCalledWith('/schedule');

      // Saved Addresses
      fireEvent.click(screen.getByText(/Saved Addresses/i));
      expect(mockPush).toHaveBeenCalledWith('/addresses');

      // Wallet & Payment Methods
      fireEvent.click(screen.getByText(/Payment Methods & Cards/i));
      expect(mockPush).toHaveBeenCalledWith('/wallet');

      // Delivery Archive
      fireEvent.click(screen.getByText(/Delivery Waybill Archive/i));
      expect(mockPush).toHaveBeenCalledWith('/history');

      // Chat with Rider
      fireEvent.click(screen.getByText(/Chat with Courier \(Tariq\)/i));
      expect(mockPush).toHaveBeenCalledWith('/chat');

      // Support Desk
      fireEvent.click(screen.getByText(/24\/7 Support & Help Center/i));
      expect(mockPush).toHaveBeenCalledWith('/support');

      // Notifications
      fireEvent.click(screen.getByText(/Notifications/i));
      expect(mockPush).toHaveBeenCalledWith('/notifications');
    });

    it('verifies dark mode toggle is removed from profile overview', () => {
      render(
        <ThemeProvider>
          <ProfileSettingsView initialTab="profile" />
        </ThemeProvider>
      );

      expect(screen.queryByLabelText(/Toggle dark mode/i)).toBeNull();
    });
  });

  describe('2. Edit Profile Subview Form & Avatar Management', () => {
    it('switches to edit mode from profile overview and renders all inputs', () => {
      render(
        <ThemeProvider>
          <ProfileSettingsView initialTab="profile" />
        </ThemeProvider>
      );

      // Click Edit button
      const editButton = screen.getByRole('button', { name: /Edit/i });
      fireEvent.click(editButton);

      expect(screen.getByRole('heading', { name: /Edit Profile/i })).toBeDefined();
      expect(screen.getByLabelText(/Full Name/i)).toBeDefined();
      expect(screen.getByLabelText(/Username \/ Sender Tag/i)).toBeDefined();
      expect(screen.getByLabelText(/Phone Number/i)).toBeDefined();
      expect(screen.getByLabelText(/Email Address/i)).toBeDefined();
      expect(screen.getByLabelText(/Company \/ Organization/i)).toBeDefined();
    });

    it('allows changing avatar photo via modal and resets avatar', () => {
      render(
        <ThemeProvider>
          <ProfileSettingsView initialTab="edit" />
        </ThemeProvider>
      );

      // Open Avatar Modal
      fireEvent.click(screen.getByRole('button', { name: /Choose Photo/i }));
      expect(screen.getByRole('heading', { name: /Select Profile Photo/i })).toBeDefined();

      // Pick Preset #2
      const presetButtons = screen.getAllByRole('button', { name: /Preset/i });
      expect(presetButtons.length).toBeGreaterThan(0);
      fireEvent.click(presetButtons[1]!);

      expect(screen.getByText(/Avatar preset #2 chosen/i)).toBeDefined();

      // Click Reset Avatar
      fireEvent.click(screen.getByRole('button', { name: /Reset/i }));
      expect(screen.getByText(/Avatar reset to default profile photo/i)).toBeDefined();
    });

    it('submits edit profile form and reflects updated details in profile view', () => {
      render(
        <ThemeProvider>
          <ProfileSettingsView initialTab="edit" />
        </ThemeProvider>
      );

      const nameInput = screen.getByLabelText(/Full Name/i) as HTMLInputElement;
      const tagInput = screen.getByLabelText(/Username \/ Sender Tag/i) as HTMLInputElement;
      const phoneInput = screen.getByLabelText(/Phone Number/i) as HTMLInputElement;

      fireEvent.change(nameInput, { target: { value: 'Babatunde Danladi' } });
      fireEvent.change(tagInput, { target: { value: 'babatunde_express' } });
      fireEvent.change(phoneInput, { target: { value: '803 999 0000' } });

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

      // Returns to profile view
      expect(screen.getByRole('heading', { name: /Account & Profile/i })).toBeDefined();
      expect(screen.getByText('Babatunde Danladi')).toBeDefined();
      expect(screen.getByText(/@babatunde_express/i)).toBeDefined();
      expect(screen.getByText(/\+234 803 999 0000/i)).toBeDefined();
      expect(screen.getByText(/Profile credentials successfully updated/i)).toBeDefined();
    });
  });

  describe('3. App Settings Subview & Security Preferences', () => {
    it('renders dispatch and safety settings with dark mode removed', () => {
      render(
        <ThemeProvider>
          <ProfileSettingsView initialTab="settings" />
        </ThemeProvider>
      );

      expect(screen.getByRole('heading', { name: /App Settings/i })).toBeDefined();
      expect(screen.queryByText(/THEME APPEARANCE/i)).toBeNull();
      expect(screen.getByText(/DISPATCH & SAFETY/i)).toBeDefined();
    });

    it('toggles security switches (Handover OTP, Insurance, Biometrics)', () => {
      render(
        <ThemeProvider>
          <ProfileSettingsView initialTab="settings" />
        </ThemeProvider>
      );

      const otpToggle = document.getElementById('settingOtpToggle') as HTMLInputElement;
      const insuranceToggle = document.getElementById('settingInsuranceToggle') as HTMLInputElement;
      const bioToggle = document.getElementById('settingBioToggle') as HTMLInputElement;

      expect(otpToggle.checked).toBe(true);
      expect(insuranceToggle.checked).toBe(true);
      expect(bioToggle.checked).toBe(true);

      fireEvent.click(otpToggle);
      expect(otpToggle.checked).toBe(false);

      fireEvent.click(insuranceToggle);
      expect(insuranceToggle.checked).toBe(false);

      fireEvent.click(bioToggle);
      expect(bioToggle.checked).toBe(false);
    });

    it('clears route and map cache when button clicked', () => {
      localStorage.setItem('bayniks_recent_searches', JSON.stringify(['Yaba', 'Ikeja']));

      render(
        <ThemeProvider>
          <ProfileSettingsView initialTab="settings" />
        </ThemeProvider>
      );

      const clearCacheBtn = screen.getByRole('button', { name: /Clear Route & Map Cache/i });
      fireEvent.click(clearCacheBtn);

      expect(localStorage.getItem('bayniks_recent_searches')).toBeNull();
      expect(screen.getByText(/Route & map cache successfully purged/i)).toBeDefined();
    });

    it('resets settings to factory defaults', () => {
      render(
        <ThemeProvider>
          <ProfileSettingsView initialTab="settings" />
        </ThemeProvider>
      );

      const resetBtn = screen.getByRole('button', { name: /Reset/i });
      fireEvent.click(resetBtn);

      expect(screen.getByText(/App settings reset to factory defaults/i)).toBeDefined();
    });
  });

  describe('4. Sign Out Behavior', () => {
    it('triggers onSignOut callback or navigates to signin page', () => {
      const handleCustomSignOut = vi.fn();
      render(
        <ThemeProvider>
          <ProfileSettingsView initialTab="profile" onSignOut={handleCustomSignOut} />
        </ThemeProvider>
      );

      const signOutBtn = screen.getByRole('button', { name: /Sign Out/i });
      fireEvent.click(signOutBtn);

      expect(handleCustomSignOut).toHaveBeenCalledTimes(1);
    });

    it('defaults to signin page navigation if no onSignOut provided', () => {
      render(
        <ThemeProvider>
          <ProfileSettingsView initialTab="profile" />
        </ThemeProvider>
      );

      const signOutBtn = screen.getByRole('button', { name: /Sign Out/i });
      fireEvent.click(signOutBtn);

      expect(mockPush).toHaveBeenCalledWith('/auth/signin');
    });
  });
});

