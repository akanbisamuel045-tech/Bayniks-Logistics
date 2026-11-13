import React from 'react';
import type { Metadata } from 'next';
import { SignInView } from '../../../components/auth/SignInView';

export const metadata: Metadata = {
  title: 'Sign In — Bayniks Express Logistics',
  description: 'Sign in to access your parcel dispatch workstation and live fleet radar.',
};

export default function SignInPage() {
  return <SignInView />;
}

