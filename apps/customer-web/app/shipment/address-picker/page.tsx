'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AddressPickerModal, PinnedAddress } from '../../../components/AddressPickerModal';

export default function StandaloneAddressPickerPage() {
  const router = useRouter();
  const [confirmedAddress, setConfirmedAddress] = useState<PinnedAddress | null>(null);

  const handleConfirm = (pinned: PinnedAddress) => {
    setConfirmedAddress(pinned);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6">
      <AddressPickerModal
        isOpen={true}
        target="pickup"
        onClose={() => router.push('/shipment/new')}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

