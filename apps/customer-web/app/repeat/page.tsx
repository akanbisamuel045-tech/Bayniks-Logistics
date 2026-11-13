import React from 'react';
import type { Metadata } from 'next';
import { RepeatDeliveryView } from '../../components/RepeatDeliveryView';

export const metadata: Metadata = {
  title: 'Repeat Delivery & 1-Tap Re-Order — Bayniks Express Logistics',
  description: 'Re-dispatch your frequent business and personal delivery routes in one tap with smart route memory.',
};

export default function RepeatDeliveryPage() {
  return <RepeatDeliveryView />;
}

