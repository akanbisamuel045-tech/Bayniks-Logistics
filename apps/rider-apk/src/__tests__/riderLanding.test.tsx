// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { RiderLandingScreen } from '../components/RiderLandingScreen';

describe('RiderLandingScreen (Bolt-Style Welcome First Screen)', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders Bayniks Driver logo, tagline, and dispatch motorcycle hero scene', () => {
    render(<RiderLandingScreen onSignIn={vi.fn()} onRegister={vi.fn()} />);

    expect(screen.getByText('Bayniks')).toBeDefined();
    expect(screen.getByText('Driver')).toBeDefined();
    expect(screen.getByText(/Deliver with Bayniks/i)).toBeDefined();
    expect(screen.getByText(/Earn extra money delivering/i)).toBeDefined();

    const img = screen.getByAltText(/Bayniks Courier Dispatch Motorcycle/i) as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toContain('dispatch_bike_hero.jpg');
  });

  it('renders the black Sign In pill button with orange brand accent', () => {
    const handleSignIn = vi.fn();
    render(<RiderLandingScreen onSignIn={handleSignIn} onRegister={vi.fn()} />);

    const signInBtn = screen.getByTestId('landing-sign-in-btn');
    expect(signInBtn).toBeDefined();
    expect(signInBtn.textContent).toContain('Sign in');

    // Matches user requirement: "use orange and black color{ more of black on the button) for the button"
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
