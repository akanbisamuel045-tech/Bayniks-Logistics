'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatNigerianPhoneDisplay } from './auth-utils';
import { Zap, ArrowLeft, Smartphone } from 'lucide-react';

export interface VerifyOtpViewProps {
  initialPhone?: string;
  onSuccess?: () => void;
  onBackClick?: () => void;
}

export function VerifyOtpView({ initialPhone, onSuccess, onBackClick }: VerifyOtpViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const phoneParam = initialPhone || searchParams?.get('phone') || '+2348123456789';
  const displayPhone = formatNigerianPhoneDisplay(phoneParam);

  const [digits, setDigits] = useState(['4', '8', '2', '9']);
  const [resendCooldown, setResendCooldown] = useState(45);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric characters
    const cleanChar = value.replace(/[^0-9]/g, '').slice(-1);

    const nextDigits = [...digits];
    nextDigits[index] = cleanChar;
    setDigits(nextDigits);

    if (cleanChar && index < 3) {
      inputRefs[index + 1]?.current?.focus();
    }

    // If all 4 digits are complete, trigger automatic submission
    if (cleanChar && index === 3 && nextDigits.every((d) => d !== '')) {
      handleVerify(nextDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Jump to previous box on backspace if current is empty
      inputRefs[index - 1]?.current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 4);
    if (!pasted) return;

    const nextDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      const char = pasted[i];
      if (char !== undefined) {
        nextDigits[i] = char;
      }
    }
    setDigits(nextDigits);

    const targetFocus = Math.min(pasted.length, 3);
    inputRefs[targetFocus]?.current?.focus();

    if (pasted.length === 4) {
      handleVerify(pasted);
    }
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    setResendCooldown(45);
    showToast('New 4-digit OTP code sent via SMS');
  };

  const handleVerify = (codeToVerify?: string) => {
    const code = codeToVerify || digits.join('');
    if (code.length < 4) {
      showToast('Please enter all 4 digits of your OTP');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast('Phone verified successfully! Welcome to Bayniks.');
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/');
        }
      }, 500);
    }, 400);
  };

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.push('/auth/signup');
    }
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
      <header className="px-6 py-4 flex items-center justify-between max-w-md w-full mx-auto shrink-0">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to sign up"
          className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 bg-white text-slate-800 shadow-sm border border-slate-200 hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-bayniks-orange">
          Step 2 of 2 • Security
        </span>

        <div className="w-10" />
      </header>

      {/* Main OTP Chassis */}
      <main className="flex-1 w-full max-w-md mx-auto px-6 py-4 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="w-14 h-14 rounded-3xl bg-bayniks-orange/15 border border-bayniks-orange/30 flex items-center justify-center text-bayniks-orange shadow-sm">
            <Smartphone className="w-7 h-7 text-bayniks-orange" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Enter 4-digit code</h1>
            <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
              We sent a verification SMS to <strong className="text-slate-900 font-mono">{displayPhone}</strong>
            </p>
          </div>

          {/* 4-Digit Input Boxes */}
          <div className="grid grid-cols-4 gap-3 pt-2" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                id={`otpDigit${index + 1}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                aria-label={`OTP Digit ${index + 1}`}
                className={`w-full h-16 text-center text-2xl font-mono font-extrabold rounded-2xl border-2 transition focus:outline-none bg-white text-slate-900 border-slate-300 focus:border-bayniks-orange ${
                  digit ? 'border-bayniks-orange' : ''
                }`}
              />
            ))}
          </div>

          {/* Resend Code Row */}
          <div className="flex items-center justify-between rounded-2xl p-4 border bg-white border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Didn't receive the SMS?</span>
            {resendCooldown > 0 ? (
              <span className="text-xs font-mono font-bold text-slate-400">
                Resend in {resendCooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-xs font-extrabold text-bayniks-orange hover:underline"
              >
                Resend Code
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3 pt-6">
          <button
            type="button"
            onClick={() => handleVerify()}
            disabled={loading}
            className="w-full py-4 px-5 bg-bayniks-orange hover:bg-bayniks-orangeDark text-white font-extrabold text-sm rounded-2xl shadow-bolt-glow active:scale-[0.98] transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? 'Verifying Code...' : 'Verify & Access Account'}</span>
            <span>→</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] font-mono text-slate-400 shrink-0">
        Anti-Fraud Delivery Verification • Powered by Bayniks
      </footer>
    </div>
  );
}
