import React from 'react';
import type { Metadata } from 'next';
import { ScheduleDeliveryView } from '../../components/ScheduleDeliveryView';

export const metadata: Metadata = {
  title: 'Schedule Delivery & Reserve Courier Slot — Bayniks Express Logistics',
  description: 'Pre-book dedicated motorcycle courier slots with guaranteed SLA arrival windows across Lagos State.',
};

export default function ScheduleDeliveryPage() {
  return <ScheduleDeliveryView />;
}

