import React from 'react';
import type { Metadata } from 'next';
import { OnboardingView } from '../../components/OnboardingView';

export const metadata: Metadata = {
  title: 'Welcome to Bayniks Logistics — On-Demand Motorcycle Dispatch Across Lagos',
  description:
    'Instant parcel dispatch, sub-15s rider assignment, live GPS tracking, and ₦500,000 guaranteed cargo cover.',
};

export default function OnboardingPage() {
  return <OnboardingView />;
}

