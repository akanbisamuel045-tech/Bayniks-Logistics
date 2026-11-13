'use client';

import React, { useState } from 'react';
import { NewShipmentForm, NewShipmentData } from '../../../components/NewShipmentForm';
import { AddressPickerModal, PinnedAddress } from '../../../components/AddressPickerModal';

export default function NewShipmentPage() {
  const [pickerTarget, setPickerTarget] = useState<'pickup' | 'dropoff' | null>(null);
  const [formData, setFormData] = useState<Partial<NewShipmentData>>({
    pickupAddress: '12 Commercial Avenue, Sabo, Yaba, Lagos',
    pickupLandmark: 'Opposite Ozone Cinemas, Yaba',
    dropoffAddress: 'Victoria Island Towers, Plot 4, Adeola Odeku, Lagos',
    dropoffLandmark: 'Beside Zenith Bank Head Office',
  });

  const handleOpenMapPicker = (target: 'pickup' | 'dropoff') => {
    setPickerTarget(target);
  };

  const handleAddressConfirmed = (pinned: PinnedAddress) => {
    if (pickerTarget === 'pickup') {
      setFormData((prev) => ({
        ...prev,
        pickupAddress: pinned.address,
        pickupLandmark: pinned.landmark,
      }));
    } else if (pickerTarget === 'dropoff') {
      setFormData((prev) => ({
        ...prev,
        dropoffAddress: pinned.address,
        dropoffLandmark: pinned.landmark,
      }));
    }
    setPickerTarget(null);
  };

  return (
    <>
      <NewShipmentForm
        initialData={formData}
        onOpenMapPicker={handleOpenMapPicker}
      />

      <AddressPickerModal
        isOpen={pickerTarget !== null}
        target={pickerTarget || 'pickup'}
        onClose={() => setPickerTarget(null)}
        onConfirm={handleAddressConfirmed}
      />
    </>
  );
}
