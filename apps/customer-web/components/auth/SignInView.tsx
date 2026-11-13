'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../ThemeProvider';
import { ThemeToggle } from '../ThemeToggle';
import { normalizeNigerianPhone } from './auth-utils';
import { Zap, Eye, EyeOff, User, ArrowLeft } from 'lucide-react';

export interface SignInViewProps {
  onSuccess?: () => void;
  onRegisterClick?: () => void;
  onBackClick?: () => void;
}

export function SignInView({ onSuccess, onRegisterClick, onBackClick }: SignInViewProps) {
  const router = useRouter();
  const { isDark } = useTheme();

  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('812 345 6789');
  const [email, setEmail] = useState('kainul.merchant@bayniks.com');
  const [password, setPassword] = useState('LagosExpress2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.push('/onboarding');
    }
  };

  const handleRegister = () => {
    if (onRegisterClick) {
      onRegisterClick();
    } else {
      router.push('/auth/signup');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulated auth verification
    setTimeout(() => {
      setLoading(false);
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/');
      }
    }, 400);
  };

  const handleBiometricAuth = () => {
    showToast('Biometric Face ID / Fingerprint authenticated');
    setTimeout(() => {
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/');
      }
    }, 600);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 text-slate-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-bayniks-orange text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-bolt-glow flex items-center space-x-2 animate-bounce">
          <Zap className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-md w-full mx-auto shrink-0 border-b border-slate-200 bg-white">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to onboarding"
          className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 bg-slate-100 text-slate-800 shadow-sm hover:bg-slate-200"
        >
          <span className="text-base">←</span>
        </button>

        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
          Account Access
        </span>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleRegister}
            className="text-xs font-bold text-bayniks-orange hover:underline px-1"
          >
            Register
          </button>
        </div>
      </header>

      {/* Main Form Chassis */}
      <main className="flex-1 w-full max-w-md mx-auto px-6 py-6 flex flex-col justify-center">
        <div className="space-y-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-bayniks-orange text-[10px] font-mono font-bold uppercase mb-2">
              <span>● Dispatcher Portal</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Welcome back</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Sign in to manage active parcels and monitor bike fleets.
            </p>
          </div>

          {/* Phone vs Email Toggle */}
          <div className="p-1 rounded-2xl flex items-center border bg-slate-100 border-slate-200">
            <button
              type="button"
              onClick={() => setMethod('phone')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${
                method === 'phone'
                  ? 'bg-bayniks-orange text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Phone Number
            </button>
            <button
              type="button"
              onClick={() => setMethod('email')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${
                method === 'email'
                  ? 'bg-bayniks-orange text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Email Address
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {method === 'phone' ? (
              <div>
                <label htmlFor="signInPhoneInput" className="block text-xs font-bold mb-1.5 text-slate-700">
                  Mobile Phone Number
                </label>
                <div className="flex items-center space-x-2">
                  <div className="border rounded-2xl px-3.5 py-3 flex items-center space-x-1.5 shrink-0 bg-white border-slate-300">
                    <svg className="w-4 h-3 rounded-xs overflow-hidden" viewBox="0 0 6 4" aria-hidden="true"><rect width="2" height="4" fill="#008751"/><rect x="2" width="2" height="4" fill="#FFFFFF"/><rect x="4" width="2" height="4" fill="#008751"/></svg>
                    <span className="text-xs font-mono font-bold text-slate-900">+234</span>
                  </div>
                  <input
                    id="signInPhoneInput"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="812 345 6789"
                    required
                    className="w-full text-xs font-mono font-bold px-4 py-3 rounded-2xl border transition focus:outline-none focus:ring-1 focus:ring-bayniks-orange bg-slate-50 text-slate-900 border-slate-300 focus:bg-white focus:border-bayniks-orange"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="signInEmailInput" className="block text-xs font-bold mb-1.5 text-slate-700">
                  Email Address
                </label>
                <input
                  id="signInEmailInput"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kainul.merchant@bayniks.com"
                  required
                  className="w-full text-xs font-medium px-4 py-3 rounded-2xl border transition focus:outline-none focus:ring-1 focus:ring-bayniks-orange bg-slate-50 text-slate-900 border-slate-300 focus:bg-white focus:border-bayniks-orange"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="signInPasswordInput" className="text-xs font-bold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => showToast('Password reset link sent via SMS to phone')}
                  className="text-[11px] font-bold text-bayniks-orange hover:underline"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <input
                  id="signInPasswordInput"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full text-xs font-medium px-4 py-3 pr-11 rounded-2xl border transition focus:outline-none focus:ring-1 focus:ring-bayniks-orange bg-slate-50 text-slate-900 border-slate-300 focus:bg-white focus:border-bayniks-orange"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 text-xs select-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-slate-500" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-bayniks-orange focus:ring-bayniks-orange accent-bayniks-orange"
                />
                <span className="text-slate-600">Remember this device</span>
              </label>

              <button
                type="button"
                onClick={handleBiometricAuth}
                className="inline-flex items-center space-x-1.5 text-xs font-mono font-bold text-slate-600 hover:text-bayniks-orange transition"
              >
                <User className="w-3.5 h-3.5" />
                <span>Face ID</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-5 bg-bayniks-orange hover:bg-bayniks-orangeDark text-white font-extrabold text-sm rounded-2xl shadow-bolt-glow active:scale-[0.98] transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Account'}</span>
                <span>→</span>
              </button>
            </div>
          </form>

          {/* Social / Direct WhatsApp Login Fallback */}
          <div className="pt-2 text-center">
            <p className="text-[11px] text-slate-500 font-medium">
              Enterprise customer or fleet owner?{' '}
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="text-bayniks-orange font-bold hover:underline"
              >
                Super-Admin Portal →
              </button>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] font-mono text-slate-500 shrink-0 border-t border-slate-200 bg-white">
        Secured by Bayniks 256-bit AES Token Auth
      </footer>
    </div>
  );
}

