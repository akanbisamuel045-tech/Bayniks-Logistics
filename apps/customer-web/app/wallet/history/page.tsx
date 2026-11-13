import React from 'react';
import type { Metadata } from 'next';
import { WalletLedgerView } from '../../../components/WalletLedgerView';

export const metadata: Metadata = {
  title: 'Payment History & Itemized Ledger — Bayniks Express Logistics',
  description: 'View full transaction ledger, itemized waybill receipts, and download monthly statements.',
};

export default function WalletHistoryPage() {
  return <WalletLedgerView initialTab="history" />;
}

