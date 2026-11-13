'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { HandoverQrView } from '../../components/HandoverQrView';

function HandoverPassContent() {
  const searchParams = useSearchParams();
  const waybill = searchParams.get('waybill') || searchParams.get('id') || undefined;
  const pin = searchParams.get('pin') || undefined;

  return (
    <HandoverQrView
      initialMode="pass"
      waybillId={waybill}
      handoverPin={pin}
    />
  );
}

export default function HandoverPassPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-bayniks-orange font-mono">
          Loading Contactless Handover Pass...
        </div>
      }
    >
      <HandoverPassContent />
    </Suspense>
  );
}

