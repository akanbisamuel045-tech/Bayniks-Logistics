import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { VerifyOtpView } from '../../../components/auth/VerifyOtpView';

export const metadata: Metadata = {
  title: 'Verify Phone via OTP — Bayniks Express Logistics',
  description: 'Enter the 4-digit SMS verification code to secure your Bayniks dispatch account.',
};

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center text-slate-500 text-xs font-mono">
          <span>Loading OTP Verification...</span>
        </div>
      }
    >
      <VerifyOtpView />
    </Suspense>
  );
}

