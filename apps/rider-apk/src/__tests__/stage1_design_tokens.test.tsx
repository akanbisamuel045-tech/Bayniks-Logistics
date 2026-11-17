// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useRiderStore } from '../store/riderStore';
import { MobileToast } from '../components/MobileToast';
import {
  playChime,
  playDispatchOfferChime,
  playMissionAcceptChime,
  playKeypadChime,
  playVerifiedSuccessChime,
  playErrorChime,
  playSosChime,
  playCashoutSuccessChime,
} from '../utils/audioChimes';

describe('Stage 1: Design Tokens, Multi-Tier Theme & Audio Feedback', () => {
  let storeMock: Record<string, string> = {};

  beforeEach(() => {
    vi.useFakeTimers();
    storeMock = {};

    const localStorageMock = {
      getItem: vi.fn((key: string) => storeMock[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storeMock[key] = value.toString();
      }),
      removeItem: vi.fn((key: string) => {
        delete storeMock[key];
      }),
      clear: vi.fn(() => {
        storeMock = {};
      }),
      length: 0,
      key: vi.fn(),
    };

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });

    document.documentElement.removeAttribute('data-theme');
    useRiderStore.setState({
      theme: 'light',
      toastMessage: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes default theme as light and reflects it on documentElement', () => {
    const { theme } = useRiderStore.getState();
    expect(theme).toBe('light');

    useRiderStore.getState().setTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem('bayniks_mobile_rider_theme')).toBe('light');
  });

  it('toggles theme between light and dark with localStorage persistence and toast notification', () => {
    act(() => {
      useRiderStore.getState().toggleTheme();
    });

    expect(useRiderStore.getState().theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('bayniks_mobile_rider_theme')).toBe('dark');
    expect(useRiderStore.getState().toastMessage).toBe('Dark Mode enabled');

    act(() => {
      useRiderStore.getState().toggleTheme();
    });

    expect(useRiderStore.getState().theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem('bayniks_mobile_rider_theme')).toBe('light');
    expect(useRiderStore.getState().toastMessage).toBe('Light Mode enabled');
  });

  it('manages toast display and auto-dismissal via store', () => {
    act(() => {
      useRiderStore.getState().showToast('Trip #BF-48291 Accepted');
    });

    expect(useRiderStore.getState().toastMessage).toBe('Trip #BF-48291 Accepted');

    // Fast forward 2800ms
    act(() => {
      vi.advanceTimersByTime(2800);
    });

    expect(useRiderStore.getState().toastMessage).toBeNull();
  });

  it('renders MobileToast component when visible and hidden', () => {
    const { rerender } = render(<MobileToast message={null} />);
    const toastEl = screen.getByTestId('mobile-toast');
    expect(toastEl.classList.contains('visible')).toBe(false);

    rerender(<MobileToast message="GPS centered on Joseph Okon" />);
    expect(toastEl.classList.contains('visible')).toBe(true);
    expect(screen.getByText('GPS centered on Joseph Okon')).toBeDefined();
  });

  it('executes audio chimes without runtime exceptions in headless/mocked AudioContext environments', () => {
    // Mock Web Audio Context
    const mockSetValueAtTime = vi.fn();
    const mockExponentialRamp = vi.fn();
    const mockConnect = vi.fn();
    const mockStart = vi.fn();
    const mockStop = vi.fn();

    const mockOscillator = {
      type: 'sine',
      frequency: {
        setValueAtTime: mockSetValueAtTime,
        exponentialRampToValueAtTime: mockExponentialRamp,
      },
      connect: mockConnect,
      start: mockStart,
      stop: mockStop,
    };

    const mockGain = {
      gain: {
        setValueAtTime: mockSetValueAtTime,
        exponentialRampToValueAtTime: mockExponentialRamp,
      },
      connect: mockConnect,
    };

    const MockAudioContext = vi.fn().mockImplementation(() => ({
      currentTime: 0,
      destination: {},
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => mockGain),
    }));

    (window as any).AudioContext = MockAudioContext;

    expect(() => playChime(440, 0.1, 'sine')).not.toThrow();
    expect(mockStart).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();

    expect(() => playDispatchOfferChime()).not.toThrow();
    expect(() => playMissionAcceptChime()).not.toThrow();
    expect(() => playKeypadChime()).not.toThrow();
    expect(() => playVerifiedSuccessChime()).not.toThrow();
    expect(() => playErrorChime()).not.toThrow();
    expect(() => playSosChime()).not.toThrow();
    expect(() => playCashoutSuccessChime()).not.toThrow();
  });
});
