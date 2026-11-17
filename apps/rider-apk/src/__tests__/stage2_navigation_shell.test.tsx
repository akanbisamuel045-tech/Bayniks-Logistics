// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MobileAppShell } from '../components/MobileAppShell';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { useRiderStore } from '../store/riderStore';
import * as audioChimes from '../utils/audioChimes';

describe('Stage 2: Mobile Navigation Shell & Anchored 68px Bottom Bar', () => {
  let playKeypadChimeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock localStorage safely for Node 22 jsdom environment
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, val: string) => {
        store[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach((k) => delete store[k]);
      }),
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });

    playKeypadChimeSpy = vi.spyOn(audioChimes, 'playKeypadChime').mockImplementation(() => {});

    // Reset store state
    useRiderStore.setState({
      activeTab: 'home',
      isQuickQrOpen: false,
      toastMessage: null,
      theme: 'light',
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('1. MobileAppShell Container', () => {
    it('renders the 430px centered mobile viewport shell with child content', () => {
      render(
        <MobileAppShell>
          <div data-testid="test-screen-content">Cockpit Stage Content</div>
        </MobileAppShell>
      );

      const shell = screen.getByTestId('mobile-app-shell');
      expect(shell).toBeDefined();
      expect(shell.className).toContain('mobile-app-shell');

      const content = screen.getByTestId('test-screen-content');
      expect(content).toBeDefined();
      expect(content.textContent).toBe('Cockpit Stage Content');
    });

    it('renders MobileBottomNav by default, but hides it when hideNav is true', () => {
      const { rerender } = render(
        <MobileAppShell>
          <div>Screen</div>
        </MobileAppShell>
      );

      expect(screen.getByRole('navigation', { name: /Mobile Rider Navigation/i })).toBeDefined();

      rerender(
        <MobileAppShell hideNav={true}>
          <div>Screen Without Nav</div>
        </MobileAppShell>
      );

      expect(screen.queryByRole('navigation', { name: /Mobile Rider Navigation/i })).toBeNull();
    });

    it('renders MobileToast component within the shell', () => {
      useRiderStore.setState({ toastMessage: 'Lagos Island surge alert' });

      render(
        <MobileAppShell>
          <div>Screen</div>
        </MobileAppShell>
      );

      const toast = screen.getByRole('status');
      expect(toast).toBeDefined();
      expect(toast.textContent).toContain('Lagos Island surge alert');
    });
  });

  describe('2. MobileBottomNav Structure & Visual Elements', () => {
    it('renders the 68px anchored bottom bar with Home, Center QR Orb, and Profile tabs', () => {
      render(<MobileBottomNav />);

      const nav = screen.getByRole('navigation', { name: /Mobile Rider Navigation/i });
      expect(nav).toBeDefined();
      expect(nav.className).toContain('mobile-bottom-nav');

      // Check Home button
      const homeBtn = screen.getByRole('button', { name: /Home Cockpit/i });
      expect(homeBtn).toBeDefined();
      expect(homeBtn.getAttribute('data-screen')).toBe('home');
      expect(homeBtn.textContent).toContain('Home');

      // Check Central QR Orb
      const qrOrb = screen.getByTestId('nav-center-qr-orb');
      expect(qrOrb).toBeDefined();
      expect(qrOrb.className).toContain('nav-center-qr-orb');
      expect(qrOrb.getAttribute('aria-label')).toBe('Quick QR & Handover Scanner');

      // Check Profile button
      const profileBtn = screen.getByRole('button', { name: /Rider Profile & Performance/i });
      expect(profileBtn).toBeDefined();
      expect(profileBtn.getAttribute('data-screen')).toBe('profile');
      expect(profileBtn.textContent).toContain('Profile');
    });

    it('sets Home tab as active by default with .active class on nav-tab-btn', () => {
      render(<MobileBottomNav />);

      const homeBtn = screen.getByRole('button', { name: /Home Cockpit/i });
      const profileBtn = screen.getByRole('button', { name: /Rider Profile & Performance/i });

      expect(homeBtn.className).toContain('active');
      expect(profileBtn.className).not.toContain('active');
    });
  });

  describe('3. Tab Switching, Audio Chimes & QR Quick-Action', () => {
    it('switches to Profile tab when clicked, playing audio chime and updating state', () => {
      const onSelectTabMock = vi.fn();
      render(<MobileBottomNav onSelectTab={onSelectTabMock} />);

      const profileBtn = screen.getByRole('button', { name: /Rider Profile & Performance/i });
      fireEvent.click(profileBtn);

      expect(playKeypadChimeSpy).toHaveBeenCalledTimes(1);
      expect(useRiderStore.getState().activeTab).toBe('profile');
      expect(onSelectTabMock).toHaveBeenCalledWith('profile');
      expect(profileBtn.className).toContain('active');

      const homeBtn = screen.getByRole('button', { name: /Home Cockpit/i });
      expect(homeBtn.className).not.toContain('active');
    });

    it('switches back to Home tab when clicked from Profile', () => {
      useRiderStore.setState({ activeTab: 'profile' });

      render(<MobileBottomNav />);

      const homeBtn = screen.getByRole('button', { name: /Home Cockpit/i });
      fireEvent.click(homeBtn);

      expect(playKeypadChimeSpy).toHaveBeenCalledTimes(1);
      expect(useRiderStore.getState().activeTab).toBe('home');
      expect(homeBtn.className).toContain('active');
    });

    it('highlights Profile tab when activeTab is set to earnings or support subviews', () => {
      useRiderStore.setState({ activeTab: 'earnings' });

      const { rerender } = render(<MobileBottomNav />);

      const profileBtn = screen.getByRole('button', { name: /Rider Profile & Performance/i });
      expect(profileBtn.className).toContain('active');

      useRiderStore.setState({ activeTab: 'support' });
      rerender(<MobileBottomNav />);
      expect(profileBtn.className).toContain('active');
    });

    it('triggers QR scanner opening, sets store isQuickQrOpen, and plays audio chime on Center QR Orb tap', () => {
      const onOpenQrMock = vi.fn();
      render(<MobileBottomNav onOpenQr={onOpenQrMock} />);

      const qrOrb = screen.getByTestId('nav-center-qr-orb');
      fireEvent.click(qrOrb);

      expect(playKeypadChimeSpy).toHaveBeenCalledTimes(1);
      expect(useRiderStore.getState().isQuickQrOpen).toBe(true);
      expect(onOpenQrMock).toHaveBeenCalledTimes(1);
    });
  });
});

