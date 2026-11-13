import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingView } from '../components/OnboardingView';
import { ThemeProvider } from '../components/ThemeProvider';

// Mock next/navigation useRouter
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Stage 2: Onboarding & Welcome Screen', () => {
  it('1. renders Bayniks Dispatch HQ badge and brand title', () => {
    render(
      <ThemeProvider>
        <OnboardingView />
      </ThemeProvider>
    );

    expect(screen.getByText(/BAYNIKS DISPATCH HQ • LAGOS & IBADAN/i)).toBeDefined();
    expect(screen.getByText(/Seamless Delivery,/i)).toBeDefined();
    expect(screen.getByText(/Anytime Anywhere\./i)).toBeDefined();
  });

  it('2. displays the 3 Nigerian logistics value pillars', () => {
    render(
      <ThemeProvider>
        <OnboardingView />
      </ThemeProvider>
    );

    expect(screen.getByText('₦500k Cargo Cover')).toBeDefined();
    expect(screen.getByText('Sub-15s Dispatch')).toBeDefined();
    expect(screen.getByText('4-Digit Anti-Fraud PIN')).toBeDefined();
  });

  it('3. calls custom onSignUp callback when provided, or navigates to /auth/signup', () => {
    const onSignUpMock = vi.fn();
    const { unmount } = render(
      <ThemeProvider>
        <OnboardingView onSignUp={onSignUpMock} />
      </ThemeProvider>
    );

    const signUpBtn = screen.getByRole('button', { name: /create free account/i });
    fireEvent.click(signUpBtn);
    expect(onSignUpMock).toHaveBeenCalledTimes(1);

    unmount();
    mockPush.mockClear();

    // Default router push
    render(
      <ThemeProvider>
        <OnboardingView />
      </ThemeProvider>
    );
    const defaultSignUpBtn = screen.getByRole('button', { name: /create free account/i });
    fireEvent.click(defaultSignUpBtn);
    expect(mockPush).toHaveBeenCalledWith('/auth/signup');
  });

  it('4. calls custom onSignIn callback when provided, or navigates to /auth/signin', () => {
    const onSignInMock = vi.fn();
    const { unmount } = render(
      <ThemeProvider>
        <OnboardingView onSignIn={onSignInMock} />
      </ThemeProvider>
    );

    const signInBtn = screen.getByRole('button', { name: /sign in with account/i });
    fireEvent.click(signInBtn);
    expect(onSignInMock).toHaveBeenCalledTimes(1);

    unmount();
    mockPush.mockClear();

    // Default router push
    render(
      <ThemeProvider>
        <OnboardingView />
      </ThemeProvider>
    );
    const defaultSignInBtn = screen.getByRole('button', { name: /sign in with account/i });
    fireEvent.click(defaultSignInBtn);
    expect(mockPush).toHaveBeenCalledWith('/auth/signin');
  });

  it('5. triggers guest explore action when clicked', () => {
    const onExploreMock = vi.fn();
    const { unmount } = render(
      <ThemeProvider>
        <OnboardingView onExploreDashboard={onExploreMock} />
      </ThemeProvider>
    );

    const guestBtn = screen.getByRole('button', { name: /explore live fleet radar/i });
    fireEvent.click(guestBtn);
    expect(onExploreMock).toHaveBeenCalledTimes(1);

    unmount();
    mockPush.mockClear();

    // Default router push to root
    render(
      <ThemeProvider>
        <OnboardingView />
      </ThemeProvider>
    );
    const defaultGuestBtn = screen.getByRole('button', { name: /explore live fleet radar/i });
    fireEvent.click(defaultGuestBtn);
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('6. renders footer operational metadata and copyright', () => {
    render(
      <ThemeProvider>
        <OnboardingView />
      </ThemeProvider>
    );

    expect(
      screen.getByText(/© 2026 Bayniks Express Logistics Technologies Ltd\. Lagos, Nigeria\./i)
    ).toBeDefined();
    expect(screen.getByText('Operational')).toBeDefined();
  });
});

