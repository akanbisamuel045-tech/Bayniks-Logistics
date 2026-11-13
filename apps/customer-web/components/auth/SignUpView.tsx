'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { evaluatePasswordStrength, normalizeNigerianPhone } from './auth-utils';
import { User, Briefcase, AlertCircle } from 'lucide-react';

export interface SignUpViewProps {
  onProceedToOtp?: (phone: string) => void;
  onSignInClick?: () => void;
  onBackClick?: () => void;
}

export function SignUpView({ onProceedToOtp, onSignInClick, onBackClick }: SignUpViewProps) {
  const router = useRouter();

  const [accountType, setAccountType] = useState<'personal' | 'business'>('personal');
  const [fullName, setFullName] = useState('Kainul Bello');
  const [phone, setPhone] = useState('812 345 6789');
  const [email, setEmail] = useState('kainul.merchant@bayniks.com');
  const [businessName, setBusinessName] = useState('Bello Fabrics & Co.');
  const [password, setPassword] = useState('LagosExpress2026!');
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const passwordStrength = evaluatePasswordStrength(password);

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.push('/onboarding');
    }
  };

  const handleSignIn = () => {
    if (onSignInClick) {
      onSignInClick();
    } else {
      router.push('/auth/signin');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Cargo Cover');
      return;
    }

    if (passwordStrength.score < 2) {
      setError('Please choose a stronger password with at least 8 characters');
      return;
    }

    const normalizedPhone = normalizeNigerianPhone(phone);

    if (onProceedToOtp) {
      onProceedToOtp(normalizedPhone);
    } else {
      router.push(`/auth/verify-otp?phone=${encodeURIComponent(normalizedPhone)}`);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 text-slate-900">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-md w-full mx-auto shrink-0">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to onboarding"
          className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 bg-white text-slate-800 shadow-sm border border-slate-200 hover:bg-slate-100"
        >
          <span className="text-base">←</span>
        </button>

        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-bayniks-orange animate-ping" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
            Step 1 of 2 • Register
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleSignIn}
            className="text-xs font-bold text-bayniks-orange hover:underline px-1"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Main Form Chassis */}
      <main className="flex-1 w-full max-w-md mx-auto px-6 py-4 flex flex-col justify-center">
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Create your account</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Join thousands of merchants and customers dispatching across Lagos.
            </p>
          </div>

          {/* Account Type Selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAccountType('personal')}
              className={`p-3.5 rounded-2xl border text-left transition ${
                accountType === 'personal'
                  ? 'border-bayniks-orange bg-orange-50/70 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <User className="w-5 h-5 text-bayniks-orange mb-1" />
              <div className="text-xs font-bold text-slate-900">Personal</div>
              <div className="text-[10px] text-slate-500">Occasional parcel delivery</div>
            </button>

            <button
              type="button"
              onClick={() => setAccountType('business')}
              className={`p-3.5 rounded-2xl border text-left transition ${
                accountType === 'business'
                  ? 'border-bayniks-orange bg-orange-50/70 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <Briefcase className="w-5 h-5 text-bayniks-orange mb-1" />
              <div className="text-xs font-bold text-slate-900">Business Pro</div>
              <div className="text-[10px] text-slate-500">Bulk CSV & multi-stop runs</div>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="signUpFullName" className="block text-xs font-bold mb-1.5 text-slate-800">
                Full Legal Name
              </label>
              <input
                id="signUpFullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Amina Adebayo"
                required
                className="w-full text-xs font-medium px-4 py-3 rounded-2xl border transition focus:outline-none focus:ring-1 focus:ring-bayniks-orange bg-white text-slate-900 border-slate-300 focus:border-bayniks-orange"
              />
            </div>

            {accountType === 'business' && (
              <div>
                <label htmlFor="signUpBusinessName" className="block text-xs font-bold mb-1.5 text-slate-800">
                  Business / Store Brand Name
                </label>
                <input
                  id="signUpBusinessName"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Lekki Electronics Hub"
                  required
                  className="w-full text-xs font-medium px-4 py-3 rounded-2xl border transition focus:outline-none focus:ring-1 focus:ring-bayniks-orange bg-white text-slate-900 border-slate-300 focus:border-bayniks-orange"
                />
              </div>
            )}

            <div>
              <label htmlFor="signUpPhone" className="block text-xs font-bold mb-1.5 text-slate-800">
                Mobile Phone (for OTP Verification)
              </label>
              <div className="flex items-center space-x-2">
                <div className="border rounded-2xl px-3.5 py-3 flex items-center space-x-1.5 shrink-0 bg-white border-slate-300">
                  <svg className="w-4 h-3 rounded-xs overflow-hidden" viewBox="0 0 6 4" aria-hidden="true"><rect width="2" height="4" fill="#008751"/><rect x="2" width="2" height="4" fill="#FFFFFF"/><rect x="4" width="2" height="4" fill="#008751"/></svg>
                  <span className="text-xs font-mono font-bold text-slate-800">+234</span>
                </div>
                <input
                  id="signUpPhone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="812 345 6789"
                  required
                  className="w-full text-xs font-mono font-bold px-4 py-3 rounded-2xl border transition focus:outline-none focus:ring-1 focus:ring-bayniks-orange bg-white text-slate-900 border-slate-300 focus:border-bayniks-orange"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signUpEmail" className="block text-xs font-bold mb-1.5 text-slate-800">
                Email Address
              </label>
              <input
                id="signUpEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="amina@bayniks.com"
                required
                className="w-full text-xs font-medium px-4 py-3 rounded-2xl border transition focus:outline-none focus:ring-1 focus:ring-bayniks-orange bg-white text-slate-900 border-slate-300 focus:border-bayniks-orange"
              />
            </div>

            <div>
              <label htmlFor="signUpPassword" className="block text-xs font-bold mb-1.5 text-slate-800">
                Create Secure Password
              </label>
              <input
                id="signUpPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                className="w-full text-xs font-medium px-4 py-3 rounded-2xl border transition focus:outline-none focus:ring-1 focus:ring-bayniks-orange bg-white text-slate-900 border-slate-300 focus:border-bayniks-orange"
              />

              {/* Password Strength Indicator */}
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500">Security Strength:</span>
                  <span className="font-bold text-bayniks-orange">{passwordStrength.label}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-start space-x-2.5 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 text-bayniks-orange focus:ring-bayniks-orange bg-white"
                />
                <span>
                  I agree to the <strong className="text-slate-900">Terms of Service</strong> and understand that every dispatch is protected by{' '}
                  <strong className="text-bayniks-orange font-mono">₦500k Cargo Insurance</strong>.
                </span>
              </label>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="w-full py-4 px-5 bg-bayniks-orange hover:bg-bayniks-orangeDark text-white font-extrabold text-sm rounded-2xl shadow-bolt-glow active:scale-[0.98] transition flex items-center justify-center space-x-2"
              >
                <span>Continue to Phone Verification</span>
                <span>→</span>
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 text-center text-[11px] font-mono text-slate-400 shrink-0">
        Step 1 of 2 • E.164 SMS Security
      </footer>
    </div>
  );
}

