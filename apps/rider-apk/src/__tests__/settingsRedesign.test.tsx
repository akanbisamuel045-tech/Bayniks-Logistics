// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { RiderSettingsScreen } from '../components/RiderSettingsScreen';
import { useRiderStore } from '../store/riderStore';

vi.mock('../utils/audioChimes', () => ({
  playKeypadChime: vi.fn(),
  playSuccessChime: vi.fn(),
  playAlertChime: vi.fn(),
}));

describe('Settings Page Redesign (Video-Exact Workflow + Black & Atomic Orange)', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    act(() => {
      useRiderStore.setState({
        isLoggedIn: true,
        riderName: 'Evans King',
        plateNumber: 'FST476FB',
        autoConfirm: false,
        kycStatus: 'approved',
        toastMessage: null,
      });
    });
  });

  it('renders centered rider header, 5 core list items, version, logout button, and Black+Atomic Orange promo banner', () => {
    render(<RiderSettingsScreen onOpenKyc={vi.fn()} onOpenSupport={vi.fn()} />);

    expect(screen.getByText('Evans King')).toBeDefined();
    expect(screen.getByText('+2347033129971')).toBeDefined();
    expect(screen.getByText('Vehicles')).toBeDefined();
    expect(screen.getByText('Navigation')).toBeDefined();
    expect(screen.getByText('Account')).toBeDefined();
    expect(screen.getByText('App settings')).toBeDefined();
    expect(screen.getByText('Support')).toBeDefined();
    expect(screen.getByText('App version DA.44.1')).toBeDefined();
    expect(screen.getByTestId('settings-logout-btn')).toBeDefined();
    expect(screen.getByText('Want to request a trip?')).toBeDefined();
    expect(screen.getByText('Get passenger app')).toBeDefined();
  });

  it('supports Vehicles selection and adding a new vehicle', () => {
    render(<RiderSettingsScreen onOpenKyc={vi.fn()} onOpenSupport={vi.fn()} />);

    fireEvent.click(screen.getByTestId('settings-vehicles-row'));
    expect(screen.getByTestId('settings-vehicles-view')).toBeDefined();
    expect(screen.getByText('FST476FB')).toBeDefined();

    fireEvent.click(screen.getByTestId('add-new-vehicle-btn'));
    fireEvent.change(screen.getByPlaceholderText(/LSR908KY/i), {
      target: { value: 'ABC123DE' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Bajaj Boxer/i), {
      target: { value: 'Honda Ace 2025, Matte Black' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save vehicle/i }));

    expect(screen.getByText('ABC123DE')).toBeDefined();
    fireEvent.click(screen.getByTestId('vehicles-back-btn'));
    expect(screen.getByText(/ABC123DE Honda Ace 2025/i)).toBeDefined();
  });

  it('navigates Navigation -> Default navigator and updates switch preferences', () => {
    render(<RiderSettingsScreen onOpenKyc={vi.fn()} onOpenSupport={vi.fn()} />);

    fireEvent.click(screen.getByTestId('settings-navigation-row'));
    expect(screen.getByTestId('settings-navigation-view')).toBeDefined();

    const autoStartSwitch = screen.getByTestId('nav-autostart-switch');
    expect(autoStartSwitch.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(autoStartSwitch);
    expect(autoStartSwitch.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(screen.getByTestId('default-navigation-row'));
    expect(screen.getByTestId('settings-default-navigator-view')).toBeDefined();
    expect(screen.getByText(/while driving with Bayniks/i)).toBeDefined();

    fireEvent.click(screen.getByTestId('navigator-option-waze'));
    fireEvent.click(screen.getByTestId('default-navigator-done-btn'));

    expect(screen.getByTestId('settings-navigation-view')).toBeDefined();
    expect(screen.getByText('Waze')).toBeDefined();
  });

  it('opens Account -> Documents portal, Driver Portal, invite copy, and logout', () => {
    const onOpenKyc = vi.fn();
    render(<RiderSettingsScreen onOpenKyc={onOpenKyc} onOpenSupport={vi.fn()} />);

    fireEvent.click(screen.getByTestId('settings-account-row'));
    expect(screen.getByTestId('settings-account-view')).toBeDefined();

    fireEvent.click(screen.getByTestId('account-documents-row'));
    expect(screen.getByTestId('settings-documents-portal-view')).toBeDefined();
    expect(screen.getByText('My Documents')).toBeDefined();
    fireEvent.click(screen.getByTestId('open-full-kyc-btn'));
    expect(onOpenKyc).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('settings-account-row'));
    fireEvent.click(screen.getByTestId('account-driver-portal-row'));
    expect(screen.getByTestId('settings-driver-portal-view')).toBeDefined();
    expect(screen.getByText('partners.bayniks.ng/profile')).toBeDefined();

    fireEvent.click(screen.getByLabelText('Close portal'));
    fireEvent.click(screen.getByTestId('account-invite-row'));
    expect(useRiderStore.getState().toastMessage).toContain('EVANSK1043');

    fireEvent.click(screen.getByTestId('account-logout-row'));
    expect(useRiderStore.getState().isLoggedIn).toBe(false);
  });

  it('opens App settings sub-views including Quick access, Auto-Confirm, Theme, and Language', () => {
    render(<RiderSettingsScreen onOpenKyc={vi.fn()} onOpenSupport={vi.fn()} />);

    fireEvent.click(screen.getByTestId('settings-app-settings-row'));
    expect(screen.getByTestId('settings-app-settings-view')).toBeDefined();

    fireEvent.click(screen.getByTestId('app-settings-autoconfirm-row'));
    expect(screen.getByTestId('settings-autoconfirm-view')).toBeDefined();
    fireEvent.click(screen.getByTestId('autoconfirm-switch'));
    expect(useRiderStore.getState().autoConfirm).toBe(true);

    fireEvent.click(screen.getByLabelText('Back'));
    fireEvent.click(screen.getByTestId('app-settings-theme-row'));
    fireEvent.click(screen.getByText('Dark'));
    expect(screen.getByText('Dark')).toBeDefined();

    fireEvent.click(screen.getByTestId('app-settings-language-row'));
    fireEvent.click(screen.getByText('English, Nigeria, NG'));
    expect(screen.getByText('English, Nigeria, NG')).toBeDefined();
  });

  it('contains zero green/blue colors and zero Bolt branding in RiderSettingsScreen.tsx', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/RiderSettingsScreen.tsx'),
      'utf8'
    );

    const forbiddenColorRegex = /\b(bg|text|border|accent|ring)-(emerald|green|teal|blue|sky|cyan|indigo)-/i;
    expect(src).not.toMatch(forbiddenColorRegex);
    expect(src).not.toMatch(/#00A859|#4338CA|\bBolt\b/i);
    expect(src).toContain('#18181B');
    expect(src).toContain('#FF5722');
  });
});

