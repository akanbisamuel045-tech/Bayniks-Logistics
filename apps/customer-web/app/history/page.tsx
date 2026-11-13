import React from 'react';
import type { Metadata } from 'next';
import { ShipmentHistoryView } from '../../components/ShipmentHistoryView';

export const metadata: Metadata = {
  title: 'Delivery Archive & Shipment History — Bayniks Express Logistics',
  description: 'Track, view digital invoices, and repeat dispatches across Lagos State corridors.',
};

export default function ShipmentHistoryPage() {
  return <ShipmentHistoryView />;
}

