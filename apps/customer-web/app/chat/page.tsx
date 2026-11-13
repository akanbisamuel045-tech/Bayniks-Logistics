'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CourierChatView } from '../../components/CourierChatView';

function ChatContent() {
  const searchParams = useSearchParams();
  const waybill = searchParams.get('waybill') || searchParams.get('id') || undefined;
  const courier = searchParams.get('courier') || undefined;
  const pin = searchParams.get('pin') || undefined;

  return (
    <CourierChatView
      waybillId={waybill}
      courierName={courier}
      handoverPin={pin}
    />
  );
}

export default function CourierChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-bayniks-orange font-mono">
          Loading courier secure channel...
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}

