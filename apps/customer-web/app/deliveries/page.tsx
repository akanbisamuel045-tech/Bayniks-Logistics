import React from 'react';
import type { Metadata } from 'next';
import { ActiveDeliveriesView } from '../../components/ActiveDeliveriesView';

export const metadata: Metadata = {
  title: 'Active Deliveries & Live Fleet Radar — Bayniks Express Logistics',
  description: 'Track live motorcycle courier telemetry in sub-15ms real-time across Lagos State.',
};

export default function ActiveDeliveriesPage() {
  return <ActiveDeliveriesView />;
}

