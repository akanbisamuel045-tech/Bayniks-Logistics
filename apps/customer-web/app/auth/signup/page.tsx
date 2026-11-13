import React from 'react';
import type { Metadata } from 'next';
import { SignUpView } from '../../../components/auth/SignUpView';

export const metadata: Metadata = {
  title: 'Register Free Account — Bayniks Express Logistics',
  description: 'Create a personal or business pro logistics account for on-demand dispatch across Lagos.',
};

export default function SignUpPage() {
  return <SignUpView />;
}

