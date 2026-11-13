'use client';

import React, { useState, useEffect } from 'react';
import { CheckoutConfirmationView } from '../../../components/CheckoutConfirmationView';
import { NewShipmentData } from '../../../components/NewShipmentForm';

export default function CheckoutConfirmationPage() {
  const [draftData, setDraftData] = useState<NewShipmentData | undefined>(undefined);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('bayniks-active-draft-shipment');
      if (stored) {
        setDraftData(JSON.parse(stored));
      }
    } catch {}
  }, []);

  return <CheckoutConfirmationView shipmentData={draftData} />;
}

