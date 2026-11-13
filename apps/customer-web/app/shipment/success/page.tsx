'use client';

import React, { useState, useEffect } from 'react';
import { PaymentSuccessView, OrderSuccessPayload } from '../../../components/PaymentSuccessView';

export default function PaymentSuccessPage() {
  const [orderResult, setOrderResult] = useState<OrderSuccessPayload | undefined>(undefined);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('bayniks-last-dispatched-order');
      if (stored) {
        setOrderResult(JSON.parse(stored));
      }
    } catch {}
  }, []);

  return <PaymentSuccessView orderResult={orderResult} />;
}

