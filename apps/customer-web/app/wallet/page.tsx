import React from 'react';
import type { Metadata } from 'next';
import { WalletLedgerView } from '../../components/WalletLedgerView';

export const metadata: Metadata = {
  title: 'Delivery Wallet & Linked Payment Cards — Bayniks Express Logistics',
  description: 'Manage delivery escrow balance in Integer Kobo with Paystack and Monnify virtual accounts.',
};

export default function WalletPage() {
  return <WalletLedgerView initialTab="wallet" />;
}

