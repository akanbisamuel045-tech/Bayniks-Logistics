'use client';

import React from 'react';
import { HandoverQrView } from './HandoverQrView';

export interface QrHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOrder?: {
    trackingCode: string;
    pickupPin?: string;
    deliveryPin?: string;
    recipientName?: string;
  } | null;
  initialMode?: 'scan' | 'pass';
}

export function QrHandoverModal({
  isOpen,
  onClose,
  activeOrder,
  initialMode = 'pass',
}: QrHandoverModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full h-full max-w-lg md:max-h-[92vh] md:rounded-3xl overflow-hidden shadow-2xl relative">
        <HandoverQrView
          initialMode={initialMode}
          waybillId={activeOrder?.trackingCode || 'BYN-LGS-847291'}
          handoverPin={activeOrder?.deliveryPin || activeOrder?.pickupPin || '4829'}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
