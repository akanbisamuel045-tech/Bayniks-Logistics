import React from 'react';
import type { Metadata } from 'next';
import { SavedAddressesView } from '../../components/SavedAddressesView';

export const metadata: Metadata = {
  title: 'Saved Addresses & Lagos Corridors — Bayniks Express Logistics',
  description: 'Manage personal and business dispatch locations with verified Nigerian landmarks.',
};

export default function AddressesPage() {
  return <SavedAddressesView />;
}

