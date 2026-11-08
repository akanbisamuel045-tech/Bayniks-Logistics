import React, { useState } from 'react';
import { useRiderStore, TripPhase } from '../store/riderStore';
import { koboToNaira } from '@logistics/shared-types';
import { PinVerificationModal } from './PinVerificationModal';

export const ActiveDeliverySheet: React.FC = () => {
  const {
    activeOrder,
    tripPhase,
    advanceTripPhase,
    verifyPickupPin,
    verifyDeliveryPin,
    isSubmitting,
  } = useRiderStore();

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinErrorMessage, setPinErrorMessage] = useState<string | null>(null);

  if (!activeOrder || tripPhase === 'idle') return null;

  const currentStop = activeOrder.stops[0];

  const handleMainButtonClick = () => {
    if (tripPhase === 'at_pickup' || tripPhase === 'at_dropoff') {
      setPinErrorMessage(null);
      setIsPinModalOpen(true);
    } else {
      advanceTripPhase();
    }
  };

  const handleSubmitPickupPin = async (pin: string) => {
    const res = await verifyPickupPin(pin);
    if (res.success) {
      setIsPinModalOpen(false);
      setPinErrorMessage(null);
    } else {
      setPinErrorMessage(res.error || 'Invalid pickup PIN');
    }
  };

  const handleSubmitDeliveryPinAndPod = async (pin: string, photoDataUrl: string, byteSize: number) => {
    const res = await verifyDeliveryPin(pin, photoDataUrl, byteSize, currentStop?.sequenceNumber || 1);
    if (res.success) {
      setIsPinModalOpen(false);
      setPinErrorMessage(null);
    } else {
      setPinErrorMessage(res.error || 'Invalid delivery PIN');
    }
  };

  const getPhaseConfig = (phase: TripPhase) => {
    switch (phase) {
      case 'arriving_pickup':
        return {
          stepBadge: 'STEP 1 / 4',
          title: 'HEAD TO PICKUP POINT',
          address: activeOrder.pickup.address,
          landmark: activeOrder.pickup.landmark,
          contactName: activeOrder.pickup.contactName,
          contactPhone: activeOrder.pickup.contactPhone,
          buttonText: 'ARRIVED AT PICKUP',
          buttonColor: 'bg-emerald-400 text-black shadow-emerald-500/40',
        };
      case 'at_pickup':
        return {
          stepBadge: 'STEP 2 / 4',
          title: 'COLLECT PACKAGE FROM SENDER',
          address: activeOrder.pickup.address,
          landmark: activeOrder.pickup.landmark,
          contactName: activeOrder.pickup.contactName,
          contactPhone: activeOrder.pickup.contactPhone,
          buttonText: '🔑 ENTER SENDER PICKUP PIN',
          buttonColor: 'bg-amber-400 text-black shadow-amber-500/40',
        };
      case 'in_transit':
        return {
          stepBadge: 'STEP 3 / 4',
          title: 'EN ROUTE TO DROPOFF',
          address: currentStop?.dropoffAddress || 'Customer Destination',
          landmark: currentStop?.dropoffLandmark || 'Near destination point',
          contactName: currentStop?.recipientName || 'Recipient',
          contactPhone: currentStop?.recipientPhone || '',
          buttonText: 'ARRIVED AT DROPOFF',
          buttonColor: 'bg-emerald-400 text-black shadow-emerald-500/40',
        };
      case 'at_dropoff':
        return {
          stepBadge: 'STEP 4 / 4',
          title: 'HANDOVER & VERIFY DELIVERY',
          address: currentStop?.dropoffAddress || 'Customer Destination',
          landmark: currentStop?.dropoffLandmark || 'Near destination point',
          contactName: currentStop?.recipientName || 'Recipient',
          contactPhone: currentStop?.recipientPhone || '',
          buttonText: '📸 VERIFY DELIVERY PIN & PHOTO POD',
          buttonColor: 'bg-emerald-400 text-black shadow-emerald-500/40',
        };
      default:
        return null;
    }
  };

  const config = getPhaseConfig(tripPhase);
  if (!config) return null;

  return (
    <>
      <div className="safe-bottom bg-zinc-950 border-t-2 border-zinc-800 px-4 pt-3 pb-4 shadow-2xl z-20">
        <div className="max-w-lg mx-auto flex flex-col gap-3">
          {/* Step Header & Tracking Code */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider">
                {config.stepBadge}
              </span>
              <span className="text-xs font-mono font-bold text-zinc-400">
                {activeOrder.trackingCode}
              </span>
            </div>

            <div className="text-xs font-black text-emerald-400 font-mono">
              PAYOUT: ₦{koboToNaira(activeOrder.riderEarningKobo).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Phase Instruction Title */}
          <h3 className="text-base font-black text-white uppercase tracking-tight">
            {config.title}
          </h3>

          {/* High-Visibility Nigerian Landmark Banner */}
          <div className="bg-amber-950/40 border border-amber-500/60 rounded-xl p-3 flex flex-col gap-1">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <span>🚩 KEY NIGERIAN LANDMARK</span>
            </div>
            <div className="text-sm font-black text-amber-300">
              {config.landmark}
            </div>
            <div className="text-xs text-zinc-300 font-medium">
              Address: {config.address}
            </div>
          </div>

          {/* Contact Person & One-Tap Phone Dialer */}
          <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-zinc-500">
                Contact Person
              </span>
              <span className="text-xs font-bold text-zinc-200">
                {config.contactName}
              </span>
            </div>

            {config.contactPhone && (
              <a
                href={`tel:${config.contactPhone}`}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform"
              >
                <span>📞</span>
                <span>Call ({config.contactPhone})</span>
              </a>
            )}
          </div>

          {/* Big Gloved Thumb Transition Button */}
          <button
            onClick={handleMainButtonClick}
            disabled={isSubmitting}
            className={`touch-target-large w-full py-4 px-4 rounded-2xl font-black text-base uppercase tracking-wider transition-all flex items-center justify-center shadow-lg ${
              isSubmitting
                ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                : `${config.buttonColor} active:scale-98`
            }`}
          >
            {isSubmitting ? 'UPDATING...' : config.buttonText}
          </button>
        </div>
      </div>

      {/* Tactile 4-Digit PIN & POD Modal */}
      <PinVerificationModal
        isOpen={isPinModalOpen}
        mode={tripPhase === 'at_pickup' ? 'pickup' : 'dropoff'}
        stopSequenceNumber={currentStop?.sequenceNumber || 1}
        recipientName={currentStop?.recipientName || 'Recipient'}
        isSubmitting={isSubmitting}
        errorMessage={pinErrorMessage}
        onClose={() => setIsPinModalOpen(false)}
        onSubmitPickupPin={handleSubmitPickupPin}
        onSubmitDeliveryPinAndPod={handleSubmitDeliveryPinAndPod}
      />
    </>
  );
};

