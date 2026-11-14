import React, { useEffect } from 'react';
import { useRiderStore } from '../store/riderStore';
import { koboToNaira } from '@logistics/shared-types';
import {
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  Flag,
  Navigation,
  CheckCircle2,
  X,
  Zap,
} from 'lucide-react';

export const IncomingJobModal: React.FC = () => {
  const {
    incomingOffer,
    offerSecondsLeft,
    tickOfferTimer,
    acceptOffer,
    declineOffer,
    isSubmitting,
  } = useRiderStore();

  // Run 1-second countdown ticker
  useEffect(() => {
    if (!incomingOffer) return;
    const interval = setInterval(() => {
      tickOfferTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [incomingOffer, tickOfferTimer]);

  if (!incomingOffer) return null;

  const earningNaira = koboToNaira(incomingOffer.riderEarningKobo).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const progressPercent = Math.max(0, Math.min(100, (offerSecondsLeft / 30) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end p-3 sm:p-4 safe-bottom animate-in fade-in slide-in-from-bottom duration-200">
      <div className="bg-white border-2 border-[#FF6D1F] rounded-3xl p-5 shadow-2xl flex flex-col gap-3.5 max-w-lg mx-auto w-full text-zinc-900">
        {/* Header: Offer Title & 30s Countdown Ring */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6D1F] flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF6D1F] animate-ping" />
                <h2 className="text-base font-black text-zinc-900 uppercase tracking-wider">
                  NEW DISPATCH OFFER
                </h2>
              </div>
              <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                Ref: {incomingOffer.trackingCode} • {incomingOffer.stopsCount} Destination{incomingOffer.stopsCount > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Countdown Timer Badge */}
          <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-50 border-2 border-[#FF6D1F] font-mono font-black text-lg text-[#FF6D1F] shadow-sm">
            {offerSecondsLeft}s
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              offerSecondsLeft <= 7 ? 'bg-red-500' : 'bg-[#FF6D1F]'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Massive Rider Earning Display */}
        <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 border border-zinc-200 rounded-2xl p-4 text-center">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">
            GUARANTEED TAKE-HOME PAYOUT
          </span>
          <div className="text-3xl sm:text-4xl font-black text-emerald-600 font-mono tracking-tight mt-1">
            ₦{earningNaira}
          </div>
          <div className="text-xs font-bold text-zinc-600 mt-1 flex items-center justify-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-[#FF6D1F]" />
            <span>{incomingOffer.estimatedDistanceKm} km total route distance</span>
          </div>
        </div>

        {/* Landmark Route Details */}
        <div className="space-y-2 text-xs">
          {/* Pickup Landmark */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#FF6D1F] uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-[#FF6D1F]" />
              <span>PICKUP POINT</span>
            </div>
            <div className="text-sm font-bold text-zinc-900">
              {incomingOffer.pickupAddress}
            </div>
            {incomingOffer.pickupLandmark && (
              <div className="text-[11px] font-medium text-amber-800 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <Flag className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="truncate">Landmark: {incomingOffer.pickupLandmark}</span>
              </div>
            )}
          </div>

          {/* Stops Preview */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-600 uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>CARGO LIABILITY COVERED</span>
            </div>
            <div className="text-xs font-black text-zinc-900 font-mono">
              ₦500,000 SLA Guarantee
            </div>
          </div>
        </div>

        {/* Big Gloved Thumb Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => declineOffer(incomingOffer.orderId)}
            disabled={isSubmitting}
            className="touch-target-large py-3.5 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-black text-xs uppercase tracking-wider border border-zinc-200 transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <X className="w-4 h-4 text-black bg-zinc-200 rounded-full p-0.5" />
            <span>DECLINE</span>
          </button>

          <button
            onClick={() => acceptOffer(incomingOffer.orderId)}
            disabled={isSubmitting}
            className={`touch-target-large py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider text-white transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/25 ${
              isSubmitting
                ? 'bg-zinc-400 text-white cursor-not-allowed'
                : 'bg-[#FF6D1F] hover:bg-orange-600 active:scale-95'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{isSubmitting ? 'ACCEPTING...' : 'ACCEPT JOB'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
