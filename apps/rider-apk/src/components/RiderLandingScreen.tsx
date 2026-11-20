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
      className="relative w-full h-full min-h-screen flex flex-col justify-between bg-zinc-100 select-none overflow-hidden animate-fadeIn"
      data-testid="rider-landing-screen"
    >
      {/* Top 60%: High-Angle Dispatch Bike Outdoor Scene */}
      <div className="relative flex-1 w-full min-h-[55vh] max-h-[64vh] overflow-hidden bg-zinc-200">
        <img
          src="/dispatch_bike_hero.jpg"
          alt="Bayniks Courier Dispatch Motorcycle"
          className="w-full h-full object-cover object-center"
          loading="eager"
        />

        {/* Subtle top vignette for status bar readability */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/25 to-transparent pointer-events-none" />
      </div>

      {/* Bottom 40%: Crisp White Bottom Sheet matching Bolt Welcome Layout */}
      <div className="relative z-10 w-full bg-white rounded-t-[36px] px-6 pt-7 pb-8 sm:px-8 sm:pt-8 sm:pb-10 shadow-2xl flex flex-col items-center text-center -mt-8 border-t border-zinc-100/60">
        {/* Brand Logo: Bayniks (Orange) + Driver (Black) matching Bolt (Green) + Driver (Black) */}
        <div className="flex items-center justify-center gap-1.5 mb-2.5">
          <span className="text-3xl font-black text-[#FF5722] tracking-tight">
            Bayniks
          </span>
          <span className="text-3xl font-black text-[#18181B] tracking-tight">
            Driver
          </span>
        </div>

        {/* Value Proposition Headline matching Bolt layout */}
        <div className="text-[#18181B] font-extrabold text-[19px] leading-snug tracking-tight mb-7">
          <p>Deliver with Bayniks.</p>
          <p>Earn extra money delivering.</p>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-3.5 max-w-sm">
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
        <div className="w-32 h-1 bg-zinc-300 rounded-full mt-6 opacity-60 sm:hidden" />
      </div>
    </div>
  );
};

export default RiderLandingScreen;
