// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { RiderLandingScreen } from '../components/RiderLandingScreen';

describe('RiderLandingScreen (Minimalist Bottom-Action Welcome Screen)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders Bayniks Driver logo without hero image, tagline, or partner badge', () => {
    render(<RiderLandingScreen onSignIn={vi.fn()} onRegister={vi.fn()} />);

    expect(screen.getByText('Bayniks')).toBeDefined();
    expect(screen.getByText('Driver')).toBeDefined();
    expect(screen.getByTestId('landing-bottom-actions')).toBeDefined();

    // Ensure removed copy and hero image are absent
    expect(screen.queryByText(/Deliver with Bayniks/i)).toBeNull();
    expect(screen.queryByText(/Earn extra money delivering/i)).toBeNull();
    expect(screen.queryByText(/Nigeria Courier Partner/i)).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('renders the black Sign In pill button with orange brand accent', () => {
    const handleSignIn = vi.fn();
    render(<RiderLandingScreen onSignIn={handleSignIn} onRegister={vi.fn()} />);

    const signInBtn = screen.getByTestId('landing-sign-in-btn');
    expect(signInBtn).toBeDefined();
    expect(signInBtn.textContent).toContain('Sign in');
    expect(signInBtn.className).toContain('bg-[#18181B]');
    expect(signInBtn.className).toContain('text-white');

    fireEvent.click(signInBtn);
    expect(handleSignIn).toHaveBeenCalledTimes(1);
  });

  it('renders the minimalist light gray Register pill button', () => {
    const handleRegister = vi.fn();
    render(<RiderLandingScreen onSignIn={vi.fn()} onRegister={handleRegister} />);

    const registerBtn = screen.getByTestId('landing-register-btn');
    expect(registerBtn).toBeDefined();
    expect(registerBtn.textContent).toContain('Register');
    expect(registerBtn.className).toContain('bg-[#F4F4F5]');

    fireEvent.click(registerBtn);
    expect(handleRegister).toHaveBeenCalledTimes(1);
  });
});
