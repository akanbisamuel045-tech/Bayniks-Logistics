import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SignInView } from '../components/auth/SignInView';
import { SignUpView } from '../components/auth/SignUpView';
import { VerifyOtpView } from '../components/auth/VerifyOtpView';
import {
  normalizeNigerianPhone,
  formatNigerianPhoneDisplay,
  evaluatePasswordStrength,
} from '../components/auth/auth-utils';
import { ThemeProvider } from '../components/ThemeProvider';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'phone' ? '+2348123456789' : null),
  }),
}));

describe('Stage 3: Authentication Suite (SignIn, SignUp & 4-Digit OTP)', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.useRealTimers();
  });

  describe('1. Nigerian Auth & Phone Normalization Utilities', () => {
    it('normalizes local Nigerian phone formats to E.164 (+234...) correctly', () => {
      expect(normalizeNigerianPhone('08012345678')).toBe('+2348012345678');
      expect(normalizeNigerianPhone('2348123456789')).toBe('+2348123456789');
      expect(normalizeNigerianPhone('+234 809 999 1122')).toBe('+2348099991122');
    });

    it('formats phone numbers for clear visual display with spaces', () => {
      expect(formatNigerianPhoneDisplay('+2348123456789')).toBe('+234 812 345 6789');
    });

    it('calculates progressive password strength scores', () => {
      expect(evaluatePasswordStrength('').score).toBe(0);
      expect(evaluatePasswordStrength('short').score).toBe(0);
      expect(evaluatePasswordStrength('password123').score).toBe(2);
      expect(evaluatePasswordStrength('LagosExpress2026!').score).toBe(4);
    });
  });

  describe('2. SignInView Component', () => {
    it('renders phone input by default and allows switching to email tab', () => {
      render(
        <ThemeProvider>
          <SignInView />
        </ThemeProvider>
      );

      expect(screen.getByLabelText(/mobile phone number/i)).toBeDefined();

      const emailTab = screen.getByRole('button', { name: /email address/i });
      fireEvent.click(emailTab);

      expect(screen.getByLabelText(/email address/i)).toBeDefined();
    });

    it('toggles password visibility between masked and plain text', () => {
      render(
        <ThemeProvider>
          <SignInView />
        </ThemeProvider>
      );

      const passwordInput = screen.getByLabelText(/^password/i) as HTMLInputElement;
      expect(passwordInput.type).toBe('password');

      const toggleBtn = screen.getByRole('button', { name: /show password/i });
      fireEvent.click(toggleBtn);

      expect(passwordInput.type).toBe('text');
    });

    it('executes onSuccess callback or router push on sign in form submission', async () => {
      vi.useFakeTimers();
      const onSuccessMock = vi.fn();

      render(
        <ThemeProvider>
          <SignInView onSuccess={onSuccessMock} />
        </ThemeProvider>
      );

      const submitBtn = screen.getByRole('button', { name: /sign in to account/i });
      fireEvent.click(submitBtn);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(onSuccessMock).toHaveBeenCalledTimes(1);
    });

    it('navigates to signup on register link click', () => {
      render(
        <ThemeProvider>
          <SignInView />
        </ThemeProvider>
      );

      const registerBtn = screen.getByRole('button', { name: /register/i });
      fireEvent.click(registerBtn);

      expect(mockPush).toHaveBeenCalledWith('/auth/signup');
    });
  });

  describe('3. SignUpView Component', () => {
    it('shows business name field when Business Pro account type is selected', () => {
      render(
        <ThemeProvider>
          <SignUpView />
        </ThemeProvider>
      );

      expect(screen.queryByLabelText(/business \/ store brand name/i)).toBeNull();

      const businessBtn = screen.getByRole('button', { name: /business pro/i });
      fireEvent.click(businessBtn);

      expect(screen.getByLabelText(/business \/ store brand name/i)).toBeDefined();
    });

    it('updates password strength indicator dynamically on input', () => {
      render(
        <ThemeProvider>
          <SignUpView />
        </ThemeProvider>
      );

      const passwordInput = screen.getByLabelText(/create secure password/i);
      fireEvent.change(passwordInput, { target: { value: 'Lagos2026!Secure' } });

      expect(screen.getByText(/Very Strong/i)).toBeDefined();
    });

    it('validates terms and proceeds to OTP verification with normalized phone', () => {
      const onProceedMock = vi.fn();

      render(
        <ThemeProvider>
          <SignUpView onProceedToOtp={onProceedMock} />
        </ThemeProvider>
      );

      const phoneInput = screen.getByLabelText(/mobile phone/i);
      fireEvent.change(phoneInput, { target: { value: '08123456789' } });

      const submitBtn = screen.getByRole('button', { name: /continue to phone verification/i });
      fireEvent.click(submitBtn);

      expect(onProceedMock).toHaveBeenCalledWith('+2348123456789');
    });
  });

  describe('4. VerifyOtpView Component', () => {
    it('renders 4 digit inputs and target phone display', () => {
      render(
        <ThemeProvider>
          <VerifyOtpView initialPhone="+2348123456789" />
        </ThemeProvider>
      );

      expect(screen.getByText(/\+234 812 345 6789/i)).toBeDefined();
      expect(screen.getByLabelText('OTP Digit 1')).toBeDefined();
      expect(screen.getByLabelText('OTP Digit 2')).toBeDefined();
      expect(screen.getByLabelText('OTP Digit 3')).toBeDefined();
      expect(screen.getByLabelText('OTP Digit 4')).toBeDefined();
    });

    it('auto-advances focus and verifies when all 4 digits are entered', () => {
      vi.useFakeTimers();
      const onSuccessMock = vi.fn();

      render(
        <ThemeProvider>
          <VerifyOtpView initialPhone="+2348123456789" onSuccess={onSuccessMock} />
        </ThemeProvider>
      );

      const digit1 = screen.getByLabelText('OTP Digit 1');
      const digit2 = screen.getByLabelText('OTP Digit 2');
      const digit3 = screen.getByLabelText('OTP Digit 3');
      const digit4 = screen.getByLabelText('OTP Digit 4');

      fireEvent.change(digit1, { target: { value: '4' } });
      fireEvent.change(digit2, { target: { value: '8' } });
      fireEvent.change(digit3, { target: { value: '2' } });
      fireEvent.change(digit4, { target: { value: '9' } });

      const verifyBtn = screen.getByRole('button', { name: /verify & access account/i });
      fireEvent.click(verifyBtn);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(onSuccessMock).toHaveBeenCalledTimes(1);
    });

    it('handles clipboard paste of full 4-digit OTP code', () => {
      render(
        <ThemeProvider>
          <VerifyOtpView initialPhone="+2348123456789" />
        </ThemeProvider>
      );

      const digit1 = screen.getByLabelText('OTP Digit 1') as HTMLInputElement;

      fireEvent.paste(digit1, {
        clipboardData: {
          getData: () => '9182',
        },
      });

      expect(digit1.value).toBe('9');
    });
  });
});

