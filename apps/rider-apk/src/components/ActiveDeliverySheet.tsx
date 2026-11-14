import React, { useState } from 'react';
import { useRiderStore, TripPhase } from '../store/riderStore';
import { koboToNaira } from '@logistics/shared-types';
import { PinVerificationModal } from './PinVerificationModal';
import {
  Package,
  MapPin,
  Navigation,
  Phone,
  MessageSquare,
  KeyRound,
  Camera,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Flag,
} from 'lucide-react';

interface ActiveDeliverySheetProps {
  onOpenChat?: () => void;
  onOpenSupport?: () => void;
}

export const ActiveDeliverySheet: React.FC<ActiveDeliverySheetProps> = ({
  onOpenChat,
  onOpenSupport,
}) => {
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

  const getPhaseDetails = (phase: TripPhase) => {
    switch (phase) {
      case 'arriving_pickup':
        return {
          stepNum: 1,
          stepTitle: 'STEP 1 OF 4 • COURIER EN ROUTE TO PICKUP',
          eta: 'Arriving in 6 mins',
          buttonText: 'ARRIVED AT PICKUP',
          buttonColor: 'bg-[#FF6D1F] hover:bg-orange-600 text-white shadow-orange-500/30',
          activeTarget: 'pickup',
          statusBadge: 'En Route',
        };
      case 'at_pickup':
        return {
          stepNum: 2,
          stepTitle: 'STEP 2 OF 4 • AT PICKUP POINT (COLLECTION)',
          eta: 'Waiting at Sender Gate',
          buttonText: '🔑 ENTER SENDER PICKUP PIN',
          buttonColor: 'bg-[#FF6D1F] hover:bg-orange-600 text-white shadow-orange-500/30',
          activeTarget: 'pickup',
          statusBadge: 'At Pickup',
        };
      case 'in_transit':
        return {
          stepNum: 3,
          stepTitle: 'STEP 3 OF 4 • IN TRANSIT TO DROPOFF',
          eta: 'ETA: 18 mins (4.2 km)',
          buttonText: 'ARRIVED AT DROPOFF',
          buttonColor: 'bg-[#FF6D1F] hover:bg-orange-600 text-white shadow-orange-500/30',
          activeTarget: 'dropoff',
          statusBadge: 'In Transit',
        };
      case 'at_dropoff':
        return {
          stepNum: 4,
          stepTitle: 'STEP 4 OF 4 • HANDOVER & VERIFICATION',
          eta: 'At Destination Gate',
          buttonText: '📸 VERIFY DELIVERY PIN & PHOTO POD',
          buttonColor: 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/30',
          activeTarget: 'dropoff',
          statusBadge: 'Out for Delivery',
        };
      default:
        return null;
    }
  };

  const details = getPhaseDetails(tripPhase);
  if (!details) return null;

  const currentContactName =
    details.activeTarget === 'pickup'
      ? activeOrder.pickup.contactName
      : currentStop?.recipientName || 'Recipient';
  const currentContactPhone =
    details.activeTarget === 'pickup'
      ? activeOrder.pickup.contactPhone
      : currentStop?.recipientPhone || '';

  return (
    <>
      <div className="safe-bottom bg-white border-t border-zinc-200 px-3 pt-3 pb-4 shadow-2xl z-20">
        <div className="max-w-lg mx-auto flex flex-col gap-3">
          {/* Main Delivery Card (Exact Customer Page Style) */}
          <div className="rounded-2xl border-2 border-[#FF6D1F] bg-white p-4 shadow-md space-y-3">
            {/* Top Row: Waybill, Item Description & Status Pill */}
            <div className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-black">
                  <Package className="w-5 h-5 text-black" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-zinc-900">
                      {activeOrder.trackingCode}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-[10px] font-mono font-bold text-zinc-800 border border-zinc-200">
                      OTP: 4829
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-0.5">
                    {currentStop?.packageDescription || 'Business Documents • Express Bike'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-[#FF6D1F] border border-orange-200 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6D1F] animate-pulse" />
                  <span>{details.statusBadge}</span>
                </span>
                <div className="text-[10px] font-mono font-bold text-emerald-600 mt-1">
                  Payout: ₦{koboToNaira(activeOrder.riderEarningKobo).toLocaleString('en-NG')}
                </div>
              </div>
            </div>

            {/* Step Progress Bar (Matching Customer Page 4-Step Stepper) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-bold text-[#FF6D1F]">{details.stepTitle}</span>
                <span className="text-zinc-600 font-bold">{details.eta}</span>
              </div>

              {/* 4 Horizontal Progress Bars */}
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((stepIdx) => {
                  const isCompleted = stepIdx <= details.stepNum;
                  return (
                    <div
                      key={stepIdx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        isCompleted ? 'bg-[#FF6D1F]' : 'bg-zinc-200'
                      }`}
                    />
                  );
                })}
              </div>

              <div className="flex justify-between text-[9px] text-zinc-500 font-bold uppercase tracking-wider px-0.5">
                <span>Booked</span>
                <span>Picked Up</span>
                <span>In Transit</span>
                <span>Delivered</span>
              </div>
            </div>

            {/* Route Timeline Nodes */}
            <div className="space-y-2.5 pt-1 text-xs">
              {/* Pickup Point Node */}
              <div
                className={`p-2.5 rounded-xl border transition-colors ${
                  details.activeTarget === 'pickup'
                    ? 'bg-orange-50/50 border-orange-300 shadow-sm'
                    : 'bg-zinc-50 border-zinc-200 opacity-80'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-black border-2 border-white mt-1 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        PICKUP POINT • {activeOrder.pickup.contactName}
                      </span>
                      {details.activeTarget !== 'pickup' && (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Collected</span>
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-zinc-900 text-xs mt-0.5 truncate">
                      {activeOrder.pickup.address}
                    </div>
                    {activeOrder.pickup.landmark && (
                      <div className="text-[11px] font-medium text-amber-800 mt-0.5 flex items-center gap-1">
                        <Flag className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate">Landmark: {activeOrder.pickup.landmark}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Drop-off Point Node */}
              <div
                className={`p-2.5 rounded-xl border transition-colors ${
                  details.activeTarget === 'dropoff'
                    ? 'bg-orange-50/50 border-orange-300 shadow-sm'
                    : 'bg-zinc-50 border-zinc-200 opacity-80'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF6D1F] border-2 border-white mt-1 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        DROP-OFF DESTINATION • {currentStop?.recipientName || 'Recipient'}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {activeOrder.estimatedDistanceKm || 4.2} km route
                      </span>
                    </div>
                    <div className="font-bold text-zinc-900 text-xs mt-0.5 truncate">
                      {currentStop?.dropoffAddress || 'Customer Destination Address'}
                    </div>
                    {currentStop?.dropoffLandmark && (
                      <div className="text-[11px] font-medium text-amber-800 mt-0.5 flex items-center gap-1">
                        <Flag className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate">Landmark: {currentStop.dropoffLandmark}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Contact & In-Transit Actions Bar (Matching Tariq Bar in Customer Page) */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#FF6D1F] flex items-center justify-center font-black text-white text-xs shrink-0">
                  {currentContactName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate">
                    {currentContactName}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono truncate block">
                    {currentContactPhone}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {currentContactPhone && (
                  <a
                    href={`tel:${currentContactPhone}`}
                    aria-label="Call Contact"
                    className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center transition-colors active:scale-95 border border-zinc-700"
                  >
                    <Phone className="w-4 h-4 text-white" />
                  </a>
                )}

                {onOpenChat && (
                  <button
                    onClick={onOpenChat}
                    aria-label="Chat with Customer"
                    className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center transition-colors active:scale-95 border border-zinc-700"
                  >
                    <MessageSquare className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Big Gloved Thumb Transition Button */}
          <button
            onClick={handleMainButtonClick}
            disabled={isSubmitting}
            className={`touch-target-large w-full py-4 px-4 rounded-2xl font-black text-base uppercase tracking-wider transition-all flex items-center justify-center shadow-xl ${
              isSubmitting
                ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                : `${details.buttonColor} active:scale-98`
            }`}
          >
            {isSubmitting ? 'UPDATING...' : details.buttonText}
          </button>
        </div>
      </div>

      {/* Tactile 4-Digit PIN & POD Modal */}
      <PinVerificationModal
        key={`pin-modal-${tripPhase}`}
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
