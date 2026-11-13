import React from 'react';
import type { Metadata } from 'next';
import { NotificationsCenterView } from '../../components/NotificationsCenterView';

export const metadata: Metadata = {
  title: 'Notifications & Security Alerts — Bayniks Express Logistics',
  description: 'Real-time telemetry pings, 4-digit handover OTPs, and wallet deposit notices.',
};

export default function NotificationsPage() {
  return <NotificationsCenterView />;
}

