import React from 'react';
import { playKeypadChime } from '../utils/audioChimes';

export interface RiderLandingScreenProps {
  onSignIn: () => void;
  onRegister: () => void;
}

export const RiderLandingScreen: React.FC<RiderLandingScreenProps> = ({
  onSignIn,
  onRegister,
}) => {
  return (
    <div
      className="relative w-full h-full min-h-screen flex flex-col justify-center items-center bg-white px-6 py-10 sm:px-8 select-none overflow-hidden animate-fadeIn"
      data-testid="rider-landing-screen"
    >
      {/* Centered Minimalist Typography-First Welcome Container */}
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        {/* Region / Partner Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200/80 text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-6">
          <span>🇳🇬</span>
          <span>Nigeria Courier Partner</span>
        </div>

        {/* Brand Logo: Bayniks (Orange) + Driver (Black) */}
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <span className="text-4xl font-black text-[#FF5722] tracking-tight">
            Bayniks
          </span>
          <span className="text-4xl font-black text-[#18181B] tracking-tight">
            Driver
          </span>
        </div>

        {/* Value Proposition Headline */}
        <div className="text-[#18181B] font-extrabold text-[19px] leading-snug tracking-tight mb-10">
          <p>Deliver with Bayniks.</p>
          <p>Earn extra money delivering.</p>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-3.5">
          {/* Button 1: Sign in — Primary Black Button with Orange Brand Accent */}
          <button
            type="button"
            data-testid="landing-sign-in-btn"
            onClick={() => {
              playKeypadChime();
              onSignIn();
            }}
            className="w-full h-14 rounded-full bg-[#18181B] hover:bg-black active:scale-[0.98] text-white font-bold text-base tracking-wide flex items-center justify-center gap-2.5 shadow-lg shadow-black/25 border-2 border-[#18181B] hover:border-black transition-all cursor-pointer group"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5722] group-hover:scale-110 transition-transform" />
            <span>Sign in</span>
          </button>

          {/* Button 2: Register — Minimalist Light Gray Pill */}
          <button
            type="button"
            data-testid="landing-register-btn"
            onClick={() => {
              playKeypadChime();
              onRegister();
            }}
            className="w-full h-14 rounded-full bg-[#F4F4F5] hover:bg-zinc-200 active:scale-[0.98] text-[#18181B] font-bold text-base tracking-wide flex items-center justify-center border border-zinc-200/80 transition-all cursor-pointer"
          >
            <span>Register</span>
          </button>
        </div>

        {/* Home Indicator bar for mobile gesture area */}
        <div className="w-32 h-1 bg-zinc-300 rounded-full mt-10 opacity-60 sm:hidden" />
      </div>
    </div>
  );
};

export default RiderLandingScreen;
