'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Zap, ShieldCheck, Lock, ArrowRight, ChevronRight } from 'lucide-react';

export interface OnboardingViewProps {
  onSignIn?: () => void;
  onSignUp?: () => void;
  onExploreDashboard?: () => void;
}

export function OnboardingView({
  onSignIn,
  onSignUp,
  onExploreDashboard,
}: OnboardingViewProps) {
  const router = useRouter();

  const handleSignIn = () => {
    if (onSignIn) {
      onSignIn();
    } else {
      router.push('/auth/signin');
    }
  };

  const handleSignUp = () => {
    if (onSignUp) {
      onSignUp();
    } else {
      router.push('/auth/signup');
    }
  };

  const handleExplore = () => {
    if (onExploreDashboard) {
      onExploreDashboard();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-slate-50 text-slate-900">
      {/* Background Graphic & Light Scrim */}
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full bg-cover bg-center opacity-10 scale-105 transform duration-1000"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=1600&q=80')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent" />
        <div className="absolute inset-0 bg-radial-at-c from-orange-100/30 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-20 w-full px-6 pt-5 pb-2 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-bayniks-orange text-white font-mono font-bold flex items-center justify-center shadow-bolt-glow text-base">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-mono font-extrabold text-sm tracking-wider text-slate-900">BAYNIKS</span>
            <span className="text-[10px] font-mono text-bayniks-orange block leading-none font-bold">EXPRESS LOGISTICS</span>
          </div>
        </div>

        <div className="w-9" />
      </header>

      {/* Main Content Area */}
      <main className="relative z-20 w-full max-w-5xl mx-auto px-6 py-8 flex-1 flex flex-col justify-center">
        <div className="max-w-xl space-y-6">
          {/* Status Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-bayniks-orange animate-pulse" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-orange-800">
              BAYNIKS DISPATCH HQ • LAGOS & IBADAN
            </span>
          </div>

          {/* Hero Typography */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
              Seamless Delivery,<br />
              <span className="text-bayniks-orange drop-shadow-xs">Anytime Anywhere.</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed max-w-lg">
              On-demand motorcycle dispatch and parcel delivery across Lagos. Instant sub-15s rider assignment, live GPS radar, and ₦500,000 guaranteed cargo cover on every trip.
            </p>
          </div>

          {/* Value Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-bayniks-orange flex items-center justify-center mb-2">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-slate-900">₦500k Cargo Cover</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Automated insurance on every waybill</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-bayniks-orange flex items-center justify-center mb-2">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-slate-900">Sub-15s Dispatch</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Redis Geo-pool nearest bike matching</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-bayniks-orange flex items-center justify-center mb-2">
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-slate-900">4-Digit Anti-Fraud PIN</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Contactless OTP verified handover</div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-4 sm:flex sm:space-y-0 sm:space-x-4">
            <button
              type="button"
              onClick={handleSignUp}
              className="w-full sm:w-auto flex-1 py-4 px-6 bg-bayniks-orange hover:bg-bayniks-orangeDark text-white font-extrabold text-sm rounded-2xl shadow-bolt-glow active:scale-[0.98] transition flex items-center justify-center space-x-2"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleSignIn}
              className="w-full sm:w-auto flex-1 py-4 px-6 bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-sm rounded-2xl border border-slate-200 shadow-sm active:scale-[0.98] transition flex items-center justify-center"
            >
              <span>Sign In with Account</span>
            </button>
          </div>

          {/* Guest Explore Link */}
          <div className="pt-1 text-center sm:text-left">
            <button
              type="button"
              onClick={handleExplore}
              className="text-xs font-mono text-slate-500 hover:text-bayniks-orange transition inline-flex items-center space-x-1"
            >
              <span>Explore Live Fleet Radar (Guest Mode)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer Meta */}
      <footer className="relative z-20 w-full px-6 py-4 border-t border-slate-200 bg-white max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-500 space-y-2 sm:space-y-0">
        <div>© 2026 Bayniks Express Logistics Technologies Ltd. Lagos, Nigeria.</div>
        <div className="flex items-center space-x-4">
          <span className="hover:text-slate-900 cursor-pointer">Terms of Service</span>
          <span>•</span>
          <span className="hover:text-slate-900 cursor-pointer">Privacy Policy</span>
          <span>•</span>
          <span className="text-emerald-600 flex items-center space-x-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Operational</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

